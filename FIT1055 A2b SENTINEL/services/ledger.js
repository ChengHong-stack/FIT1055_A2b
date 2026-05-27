const crypto = require('crypto');

class CryptographicLedger {
    constructor() {
        this.chain = [];
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        const genesis = {
            index: 0,
            timestamp: Date.now(),
            action: "SENTINEL_INITIALIZED",
            previousHash: "0"
        };
        genesis.hash = this.calculateHash(genesis);
        this.chain.push(genesis);
    }

    calculateHash(block) {
        const dataToHash = block.index + block.previousHash + block.timestamp + JSON.stringify(block.action);
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
    }

    logAction(actionData) {
        const previousBlock = this.chain[this.chain.length - 1];
        const newBlock = {
            index: previousBlock.index + 1,
            timestamp: Date.now(),
            action: actionData,
            previousHash: previousBlock.hash
        };
        newBlock.hash = this.calculateHash(newBlock);
        this.chain.push(newBlock);
        return newBlock;
    }

    getLedger() {
        return this.chain;
    }
}

module.exports = new CryptographicLedger();