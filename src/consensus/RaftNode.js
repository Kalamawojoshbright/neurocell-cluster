class RaftNode {
  constructor(nodeId, clusterPeers = [], rpcTransport = null) {
    this.nodeId = nodeId;
    this.peers = clusterPeers;
    this.transport = rpcTransport;

    this.state = 'FOLLOWER'; // FOLLOWER, CANDIDATE, LEADER
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.leaderId = null;

    this.heartbeatIntervalMs = 50;
    this.electionTimeoutMs = Math.floor(Math.random() * 150) + 150; // 150-300ms
    this.timer = null;
  }

  startTimer() {
    this.resetTimer();
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
    let votesReceived = 1; // Vote for self

    this.resetTimer();

    if (!this.transport) return;

    for (const peerId of this.peers) {
      try {
        const res = await this.transport.send(peerId, 'requestVote', {
          term: this.currentTerm,
          candidateId: this.nodeId
        });
        if (res && res.voteGranted) {
          votesReceived++;
        }
      } catch (err) {
        // Peer unreachable
      }
    }

    const majority = Math.floor((this.peers.length + 1) / 2) + 1;
    if (votesReceived >= majority && this.state === 'CANDIDATE') {
      this.becomeLeader();
    }
  }

  becomeLeader() {
    this.state = 'LEADER';
    this.leaderId = this.nodeId;
    this.sendHeartbeats();
    this.resetTimer();
  }

  sendHeartbeats() {
    if (this.state !== 'LEADER' || !this.transport) return;
    for (const peerId of this.peers) {
      this.transport.send(peerId, 'appendEntries', {
        term: this.currentTerm,
        leaderId: this.nodeId,
        entries: []
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

  appendEntries(term, leaderId) {
    if (term >= this.currentTerm) {
      this.currentTerm = term;
      this.state = 'FOLLOWER';
      this.leaderId = leaderId;
      this.votedFor = null;
      this.resetTimer();
      return { success: true, term: this.currentTerm };
    }
    return { success: false, term: this.currentTerm };
  }
}

module.exports = RaftNode;
