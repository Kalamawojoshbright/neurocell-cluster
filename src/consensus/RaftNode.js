class RaftNode {
  constructor(nodeId, clusterPeers = [], rpcTransport = null) {
    this.nodeId = nodeId;
    this.peers = clusterPeers;
    this.transport = rpcTransport;

    this.state = 'FOLLOWER'; 
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = []; // [{ term, command }]
    this.commitIndex = 0;
    this.lastApplied = 0;

    this.nextIndex = new Map();
    this.matchIndex = new Map();

    this.leaderId = null;
    this.heartbeatIntervalMs = 50;
    this.electionTimeoutMs = Math.floor(Math.random() * 150) + 150;
    this.timer = null;
  }

  resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    if (this.state === 'LEADER') {
      this.timer = setInterval(() => this.sendHeartbeats(), this.heartbeatIntervalMs);
    } else {
      this.timer = setTimeout(() => this.startElection(), this.electionTimeoutMs);
    }
  }

  stopTimer() {
    if (this.timer) clearTimeout(this.timer);
  }

  async startElection() {
    this.state = 'CANDIDATE';
    this.currentTerm += 1;
    this.votedFor = this.nodeId;
    let votesReceived = 1;

    this.resetTimer();
    if (!this.transport) return;

    for (const peerId of this.peers) {
      try {
        const res = await this.transport.send(peerId, 'requestVote', {
          term: this.currentTerm,
          candidateId: this.nodeId
        });
        if (res && res.voteGranted) votesReceived++;
      } catch (err) {}
    }

    const majority = Math.floor((this.peers.length + 1) / 2) + 1;
    if (votesReceived >= majority && this.state === 'CANDIDATE') {
      this.becomeLeader();
    }
  }

  becomeLeader() {
    this.state = 'LEADER';
    this.leaderId = this.nodeId;
    for (const peer of this.peers) {
      this.nextIndex.set(peer, this.log.length + 1);
      this.matchIndex.set(peer, 0);
    }
    this.sendHeartbeats();
    this.resetTimer();
  }

  async propose(command) {
    if (this.state !== 'LEADER') {
      throw new Error("Only LEADER can process proposals");
    }

    const entry = { term: this.currentTerm, command };
    this.log.push(entry);
    const entryIndex = this.log.length;

    let replicatedCount = 1;

    for (const peerId of this.peers) {
      try {
        const prevLogIndex = entryIndex - 1;
        const prevLogTerm = prevLogIndex > 0 ? this.log[prevLogIndex - 1].term : 0;

        const res = await this.transport.send(peerId, 'appendEntries', {
          term: this.currentTerm,
          leaderId: this.nodeId,
          prevLogIndex,
          prevLogTerm,
          entries: [entry],
          leaderCommit: this.commitIndex
        });

        if (res && res.success) {
          replicatedCount++;
          this.matchIndex.set(peerId, entryIndex);
        }
      } catch (err) {}
    }

    const majority = Math.floor((this.peers.length + 1) / 2) + 1;
    if (replicatedCount >= majority) {
      this.commitIndex = entryIndex;
      // Notify followers immediately of the updated commit index
      await this.sendHeartbeats();
      return { status: 'COMMITTED', index: entryIndex };
    }
    return { status: 'UNCOMMITTED', index: entryIndex };
  }

  async sendHeartbeats() {
    if (this.state !== 'LEADER' || !this.transport) return;
    for (const peerId of this.peers) {
      await this.transport.send(peerId, 'appendEntries', {
        term: this.currentTerm,
        leaderId: this.nodeId,
        prevLogIndex: this.log.length,
        prevLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0,
        entries: [],
        leaderCommit: this.commitIndex
      }).catch(() => {});
    }
  }

  requestVote(term, candidateId) {
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.state = 'FOLLOWER';
      this.votedFor = candidateId;
      this.resetTimer();
      return { voteGranted: true, term: this.currentTerm };
    }
    return { voteGranted: false, term: this.currentTerm };
  }

  appendEntries(term, leaderId, prevLogIndex = 0, prevLogTerm = 0, entries = [], leaderCommit = 0) {
    if (term < this.currentTerm) {
      return { success: false, term: this.currentTerm };
    }

    this.currentTerm = term;
    this.state = 'FOLLOWER';
    this.leaderId = leaderId;
    this.resetTimer();

    if (entries.length > 0) {
      this.log.push(...entries);
    }

    if (leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, this.log.length);
    }

    return { success: true, term: this.currentTerm };
  }
}

module.exports = RaftNode;
