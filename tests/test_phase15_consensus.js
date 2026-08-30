const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');

console.log("Initializing Phase 15 Consensus & Transport Tests...");

const node1 = new RaftNode('node_1', ['node_2', 'node_3']);
const transport = new ClusterRpcTransport('node_1');

transport.registerHandler('vote', (data) => node1.requestVote(data.term, data.candidateId));

const response = transport.handlers.get('vote')({ term: 1, candidateId: 'node_2' });
console.assert(response.voteGranted === true, "Vote should be granted for higher term");
console.assert(node1.votedFor === 'node_2', "Voted candidate should be stored");

console.log("Phase 15 Initial Consensus Setup: PASSED");
