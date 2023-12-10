const { RBTree } = require("bintrees");
const md5 = require("md5");

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
    this.hashRing = new RBTree((a, b) => Comparator.defaultCompare(a, b));
    this.mappedNodes = new Map();
    this.buildHashRing();
  }

  // Hashes a string using md5
  hashString(str) {
    return md5(str);
  }

  // builds the hash ring
  buildHashRing() {
    let count = 0;
    for (const node of this.nodes) {
      for (let i = 0; i < this.virtualNodes[count]; i++) {
        const virtualNode = `${node}_${i}`;
        const hash = this.hashString(virtualNode);
        console.log(`Node : ${virtualNode} - Hash : ${hash}`);
        this.hashRing.insert(hash);
        this.mappedNodes.set(hash, node);
      }
      count++;
    }
  }

  // returns the node responsible for the key
  getNode(key) {
    const hash = this.hashString(key);
    const nodeHash = this.findClosestNode(hash);
    console.log(`Key : ${key} - Hash : ${hash} - Node Hash : ${nodeHash}`);
    return this.hashRing.find(nodeHash);
  }

  // return the node iterator responsible for the key
  getNodeIt(key) {
    const hash = this.hashString(key);
    let nodeHash = this.findClosestNode(hash);
    if (nodeHash === null) {
      let it = this.hashRing.iterator();
      it.next();
      nodeHash = it.data();
    }
    return this.hashRing.findIter(nodeHash);
  }

  // returns the node responsible for the hash
  findClosestNode(hash) {
    let nodeHash = this.hashRing.upperBound(hash);
    // If the hash is greater than all nodes, loop back to the first node
    if (!nodeHash) nodeHash = this.hashRing.iterator().next();
    return nodeHash.data();
  }

  // adds a node to the ring
  addNode(node, weight = 1) {
    for (let i = 0; i < weight; i++) {
      const virtualNode = `${node}_${i}`;
      const hash = this.hashString(virtualNode);
      this.hashRing.insert(hash, node);
      this.mappedNodes.set(hash, node);
    }
  }

  // removes a node from the ring
  removeNode(node) {
    const node0 = `${node}_0`;
    for (let i = 0; i < this.mappedNodes.get(this.hashString(node0)); i++) {
      const virtualNode = `${node}_${i}`;
      const hash = this.hashString(virtualNode);
      this.hashRing.remove(hash);
      this.mappedNodes.delete(hash);
    }
  }

  // prints the node ranges
  showNodeRanges() {
    console.log("Node Ranges:");
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
        rangePercentage = (
          ((nextNodeHash - nodeHash) / totalAvailableHashes) *
          100
        ).toFixed(2);
      } else {
        const range1 = totalAvailableHashes - nodeHash;
        const range2 = nextNodeHash;
        rangePercentage = (
          ((range1 + range2) / totalAvailableHashes) *
          100
        ).toFixed(2);
      }

      console.log(
        `Node: ${node} - Range: [${nodeHash}, ${nextNodeHash}) - Percentage: ${rangePercentage}%`
      );

      item = nextNode;
      nextNode = it.next();
    }
  }

  // n is the size of the quorum, it returns the next n nodes in the ring
  // starting from the node that is responsible for the key
  getNextNNodes(key, n) {
    let principleNode = this.getNodeIt(key);
    const nodes = [];
    for (let i = 0; i < n; i++) {
      let nextNode = principleNode.next();
      if (nextNode === null) {
        principleNode = this.hashRing.iterator();
        nextNode = principleNode.next();
      }
      nodes.push(nextNode);
    }
    return nodes;
  }

  // returns the node associated with the hash
  getNodeFromHash(hash) {
    return this.mappedNodes.get(hash);
  }

  // returns the nodes responsible for the hashes
  getNodesFromHashes(hashes) {
    return hashes.map((hash) => this.mappedNodes.get(hash));
  }

  // prints the nodes and their respective hashes on the ring
  printRingNodes() {
    console.log("Nodes and Respective Hashes on the Ring:");
    var it = this.hashRing.iterator(),
      item;
    while ((item = it.next()) !== null) {
      console.log(`Node Hash: ${item}`);
    }
  }
}

module.exports = { ConsistentHashing };
