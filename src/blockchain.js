/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const Block = require('bitcoinjs-lib/src/block');

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      let block = new BlockClass.Block({ data: "Genesis Block" });
      let errorLog = await this.validateChain();
      if (errorLog.length == 0) {
        await this._addBlock(block);
      }
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    let err = null;
    let self = this;
    return new Promise(async (resolve, reject) => {
      try {
        //Set block height
        block.height = self.chain.length;
        //Set block time as UTC timestamp
        block.time = new Date().getTime().toString().slice(0, -3);
        //Load previous block hash
        if (self.chain.length > 0) {
          block.previousBlockHash = self.chain[self.chain.length - 1].hash;
        }
        //calc block hash
        block.hash = SHA256(JSON.stringify(block)).toString();
        //Add block to the chain
        self.chain.push(block);
        //Increase the height
        self.height++;
        resolve(block);
      } catch (e) {
        err = e;
      }
      if (err != null) {
        reject(err);
      }
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise((resolve) => {
      //Create a message with the following pieces:
      //1 Wallet Address
      //2 UTC time stamp (date time)
      //3 starRegistry constant
      let message = `${address}:${new Date()
        .getTime()
        .toString()
        .slice(0, -3)}:starRegistry`;
      resolve(message);
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  submitStar(address, message, signature, star) {
    let self = this;
    let err = null;
    return new Promise(async (resolve, reject) => {
      try {
        //1 Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
        const msgTime = parseInt(message.split(":")[1]);
        //2 Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
        const curTime = parseInt(new Date().getTime().toString().slice(0, -3));
        //3 Check if the time elapsed is less than 5 minutes
        const maxTimeElapsed = 5 * 60;
        if (maxTimeElapsed < curTime - msgTime) {
          reject(new Error("Elapsed time passed the 5 mins limit"));
        }
        //4 Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
        const verification = bitcoinMessage.verify(message, address, signature);
        //5 Create the block and add it to the chain
        if (verification) {
          //6 Resolve with the block added.
          const block = new BlockClass.Block({ star: star, owner: address });
          let errorLog = await self.validateChain();
          let addedBlock = null;
          if (errorLog.length == 0) {
            addedBlock = await this._addBlock(block);
          }

          resolve(addedBlock);
        } else {
          reject(new Error("Wallet address and signature verification failed"));
        }
      } catch (e) {
        err = e;
      }
      if (err != null) {
        console.log(err);
        reject(err);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    let self = this;
    return new Promise((resolve, reject) => {
      //Check if the hash is valid and if the chain has at least the genesis block
      if (self.chain.length == 0 || hash == null) {
        resolve(null);
      }
      //Search for the hash
      const block = self.chain.find((a) => a.hash === hash);
      //if a block was found resolve with it otherwise return null
      if (block) {
        resolve(block);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      let block = self.chain.filter((p) => p.height === height)[0];
      if (block) {
        resolve(block);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  async getStarsByWalletAddress(address) {
    let self = this;
    let err = null;
    let stars = [];

    return new Promise(async (resolve, reject) => {
      try {
        //Walk thorugh all the blocks
        for (const block of self.chain) {
          const blockData = await block.getBData();
          if (blockData != null) {
            if (blockData.owner == address) {
              stars.push(blockData);
            }
          }
        }
        resolve(stars);
      } catch (e) {
        err = e;
      }
      if (err != null) {
        reject(err);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    let self = this;
    let err = null;
    let errorLog = [];
    return new Promise(async (resolve, reject) => {
      try {
        //Walk thorugh all the blocks
        self.chain.forEach((block) => {
          //Verify each block hash
          const valid = block.validate();
          if (!valid) {
            errorLog.push(block);
          }
          //Skip genesis block and validate with the previous hash with the previous block
          if (block.height > 0) {
            prevBlock = this.getBlockByHeight(block.height - 1);
            if (prevBlock.hash != block.hash) {
              errorLog.push(block);
            }
          }
        });
        resolve(errorLog);
      } catch (e) {
        err = e;
      }
      if (err != null) {
        reject(err);
      }
    });
  }
}

module.exports.Blockchain = Blockchain;   
