import { List, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'
import { DecentralizedGeneral } from './decentralized'
import * as messages from '../messages'

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

const minimumPeers = 3

const arbitraryNegativeNumber = -10

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class InsecureDecentralized extends DecentralizedGeneral {
  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    // send message to server that we ready
    this.sendReadyMessage(round)

    //prepare weights to send to peers
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    // Broadcast our weights when peerSize is above threshold (thus why it starts at an arbitrary negative)
    let peerSize: number = arbitraryNegativeNumber

    //wait for client to receive list of peers
    await this.resolvePause(() => this.peers.size >= minimumPeers)
    if (this.server === undefined) {
      throw new Error('server undefined so we cannot send weights through it')
    }
    //create weights message and send to all peers
    for (let peerDest = 0; peerDest < this.peers.size; peerDest++) {
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: weightsToSend,
        destination: peerDest
      }
      const encodedMsg = msgpack.encode(msg)
      this.peerMessageTemp(encodedMsg)
    }
    //reset peers at end of round
    this.peers = List<number>()

    //wait to receive all weights from peers
    await this.resolvePause(() => this.receivedWeights.size >= minimumPeers)
    const weightsArray = Array.from(this.receivedWeights.values())
    const finalWeights = Set(weightsArray)

    // Return the new "received" weights
    return aggregation.averageWeights(finalWeights)
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
