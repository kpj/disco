import express from 'express';
import _ from 'lodash';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as requests from '../request_handlers/federated/requests.js';
import * as config from '../../server.config.js';
import tasks from '../tasks/tasks.js';
import { makeID } from '../helpers/helpers.js';
import { PeerServer } from 'peer';

// General tasks routes

const tasksRouter = express.Router();
tasksRouter.get('/', requests.getAllTasksData);
tasksRouter.get('/:task/:file', requests.getInitialTaskModel);

// Declare federated routes
const federatedRouter = express.Router();
federatedRouter.get('/', (req, res) => res.send('FeAI server'));

federatedRouter.get('/connect/:task/:id', requests.connectToServer);
federatedRouter.get('/disconnect/:task/:id', requests.disconnectFromServer);

federatedRouter.post(
  '/send_weights/:task/:round',
  requests.sendIndividualWeights
);
federatedRouter.post(
  '/receive_weights/:task/:round',
  requests.receiveAveragedWeights
);

federatedRouter.post(
  '/send_nbsamples/:task/:round',
  requests.sendDataSamplesNumber
);
federatedRouter.post(
  '/receive_nbsamples/:task/:round',
  requests.receiveDataSamplesNumbersPerClient
);

federatedRouter.use('/tasks', tasksRouter);

federatedRouter.get('/logs', requests.queryLogs);

// Declare DeAI routes
const decentralisedRouter = express.Router();

const ports = _.range(
  config.START_TASK_PORT,
  config.START_TASK_PORT + tasks.length
);
_.forEach(
  _.zip(tasks, ports),
  _.spread((task, port) => {
    /**
     * Create a peer server for each task on its corresponding port.
     */
    PeerServer({
      path: `/DeAI/${task.taskID}`,
      allow_discovery: true,
      port: port,
      generateClientId: makeID(10),
      proxied: true,
    });
    /**
     * Make the peer server's port accessible from a regular URL
     * on the DeAI server.
     */
    decentralisedRouter.use(
      `/${task.taskID}`,
      createProxyMiddleware({
        target: `${config.SERVER_URI}:${port}`,
        changeOrigin: true,
        ws: true,
      })
    );
  })
);

decentralisedRouter.use('/tasks', tasksRouter);
decentralisedRouter.get('/', (req, res) => res.send('DeAI server'));

export { federatedRouter, decentralisedRouter };

// Custom topology code (currently unused)
/*
const topology = new topologies.BinaryTree();
let peers = [];
function eventsHandler(request, response, next) {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);
    let peerId = request.params['id']
    console.log(peerId)
    const data = `data: ${JSON.stringify(topology.getNeighbours(peerId))}\n\n`;
    response.write(data);
  
    const newPeer = {
      id: peerId,
      response
    };
    peers.push(newPeer);
  
    request.on('close', () => {
      console.log(`${peerId} Connection closed`);
      peers = peers.filter(peer => peer.id !== peerId);
    });
    // call next middleware
    next()
  }
  function sendNewNeighbours(affectedPeers) {
    let peersToNotify = peers.filter(peer => affectedPeers.has(peer.id) )
    peersToNotify.forEach(peer => peer.response.write(`data: ${JSON.stringify(topology.getNeighbours(peer.id))}\n\n`))
  }
peerServer.on('connection', (client) => { 
    let affectedPeers = topology.addPeer(client.getId())
    sendNewNeighbours(affectedPeers)
});
peerServer.on('disconnect', (client) => { 
    let affectedPeers = topology.removePeer(client.getId())
    sendNewNeighbours(affectedPeers)
});
app.get('/neighbours/:id', eventsHandler);
*/
