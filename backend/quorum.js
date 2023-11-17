class Quorum {
  constructor(quorumSize, replicaPorts) {
    this.replicaPorts = replicaPorts;
    this.quorumSize = quorumSize;
  }

  getQuorumSize() {
    return this.quorumSize;
  }

  getReplicaPorts() {
    return this.replicaPorts;
  }

  setQuorumSize(quorumSize) {
    this.quorumSize = quorumSize;
  }

  setReplicaPorts(replicaPorts) {
    this.replicaPorts = replicaPorts;
  }

  async sendRequestToReplica(port, data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const url = `http://localhost:${port}/ping`;
        fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // body: JSON.stringify(data), // body only for POST, PUT
        })
          .then((response) => resolve(response.json()))
          .catch((error) => {
            // console.error(error);
            reject(new Error(`Request to replica ${port} failed`));
          });
      }, 500);
    });
  }

  async performQuorum(data) {
    const responses = [];

    for (const port of this.replicaPorts) {
      try {
        const response = await this.sendRequestToReplica(port, data);
        responses.push(response);

        // Check if quorum size is reached
        if (responses.length >= this.quorumSize) {
          if (this.areResponsesConsistent(responses)) return responses; // TO-DO: return the result of the operation
          console.error("Inconsistent responses");
          continue;
        }
      } catch (error) {
        console.error(error.message);
        // Continue with the next replica in case of failure
      }
    }

    throw new Error("Quorum not reached");
  }

  areResponsesConsistent(responses) {
    // to-do: implement this with state-based replication (hash comparison?)
    console.log("Responses:", responses);
    return responses.every(
      (response) => response.message === responses[0].message
    );
  }

  consensus(data) {
    return this.performQuorum(data)
      .then((result) => {
        console.log("Operation successful:", result);
        return result;
      })
      .catch((error) => {
        console.error("Operation failed:", error.message);
        throw error;
      });
  }
}

module.exports = Quorum;
