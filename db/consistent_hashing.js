const { RBTree } = require('bintrees');
const md5 = require('md5');

class Comparator {
  static defaultCompare(a, b) {
    if (a === b) {
      return 0;
    }
    return a < b ? -1 : 1;
  }
}

class ConsistentHashing {
  constructor(nodes = [], replicas = 3) {
    this.nodes = nodes.map(([node, _]) => node);
    this.virtualNodes = nodes.map(([_, weight]) => weight);
    this.replicas = replicas;
    this.hashRing = new RBTree((a, b) => Comparator.defaultCompare(a, b)); // Use RBTree for sorted order
    this.mappedNodes = new Map();

    this.buildHashRing();
  }

  hashString(str) {
    // Use a hash function (e.g., md5) to convert a string into a hash value
    return md5(str);
  }

  buildHashRing() {
    let count = 0;
    for (const node of this.nodes) {
      for (let i = 0; i < this.virtualNodes[count]; i++) {
        const virtualNode = `${node}_${i}`;
        const hash = this.hashString(virtualNode);
        console.log(`Node : ${virtualNode} - Hash : ${hash}`)
        this.hashRing.insert(hash);
        this.mappedNodes.set(hash, node);
      }
      count++;
    }
  }

  getNode(key) {
    const hash = this.hashString(key);
    const nodeHash = this.findClosestNode(hash);
    console.log(`Key : ${key} - Hash : ${hash} - Node Hash : ${nodeHash}`)
    return this.hashRing.find(nodeHash);
  }

  findClosestNode(hash) {
    let nodeHash = this.hashRing.upperBound(hash);

    if (!nodeHash) {
      // If the hash is greater than all nodes, loop back to the first node
      nodeHash = this.hashRing.iterator().next();
    }
    return nodeHash.data();
  }

  addNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const virtualNode = `${node}_${i}`;
      const hash = this.hashString(virtualNode);
      this.hashRing.insert(hash, node);
    }
  }

  removeNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const virtualNode = `${node}_${i}`;
      const hash = this.hashString(virtualNode);
      this.hashRing.remove(hash);
    }
  }

  showNodeRanges() {
    console.log('Node Ranges:');
    var it = this.hashRing.iterator(),
      item = it.next();
    const totalAvailableHashes = Math.pow(2, 128);

    let nextNode = it.next(); // Get the next node in the ring

    while (item !== null) {
      const node = item;
      const nodeHash = parseInt(item, 16);
      const nextNodeHash =
        nextNode !== null
          ? parseInt(nextNode, 16)
          : parseInt(this.hashRing.iterator().next(), 16);

      let rangePercentage;
      if (nextNodeHash >= nodeHash) {
        rangePercentage = (((nextNodeHash - nodeHash) / totalAvailableHashes) * 100).toFixed(2);
      } else {
        const range1 = totalAvailableHashes - nodeHash;
        const range2 = nextNodeHash;
        rangePercentage = (((range1 + range2) / totalAvailableHashes) * 100).toFixed(2);
      }

      console.log(`Node: ${node} - Range: [${nodeHash}, ${nextNodeHash}) - Percentage: ${rangePercentage}%`);

      item = nextNode;
      nextNode = it.next();
    }
  }

  getNodeFromHash(hash) {
    return this.mappedNodes.get(hash);
  }

  printRingNodes() {
    console.log('Nodes and Respective Hashes on the Ring:');
    var it = this.hashRing.iterator(), item;
    while ((item = it.next()) !== null) {
      console.log(`Node Hash: ${item}`);
    }
  }
}

// Example usage
const nodes = [['Server-1', 1], ['Server-2', 1], ['Server-3', 1]];
const consistentHashing = new ConsistentHashing(nodes);

// consistentHashing.printRingNodes();

let hash2 = consistentHashing.getNode('key-2');
console.log(`Node for key-2(${hash2}): ${consistentHashing.getNodeFromHash(hash2)}`);
// consistentHashing.showNodeRanges();

