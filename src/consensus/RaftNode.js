class RaftNode {
  constructor(nodeId, clusterPeers = []) {
    this.nodeId = nodeId;
    this.peers = clusterPeers;
    this.state = 'FOLLOWER'; // FOLLOWER, CANDIDATE, LEADER
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
  }

  requestVote(term, candidateId) {
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.state = 'FOLLOWER';
      this.votedFor = candidateId;
      return { voteGranted: true, term: this.currentTerm };
    }
    return { voteGranted: false, term: this.currentTerm };
  }
}

module.exports = RaftNode;
