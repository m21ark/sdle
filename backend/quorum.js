class Quorum {
  constructor(quorumSize, replicaPorts = []) {
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

  getReplicaActiveCount() {
    return this.replicaPorts.length;
  }

  //middleware

  async sendRequestToReplica(port, data) {
    const path = data.originalUrl.replace(/^\/api/, "");

    const url = `http://localhost:${port}${path}`;

    const requestOptions = {
      method: data.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data.method === "GET") {
      requestOptions.method = "GET";
    } else {
      requestOptions.method = "POST";
      requestOptions.body = JSON.stringify(data.body);

    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {

        fetch(url, requestOptions)
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
          if (this.areResponsesConsistent(responses)) return responses; // TODO: return the result of the operation
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
    // TODO: implement this with state-based replication (hash comparison?)
    // console.log("Responses:", responses);
    return responses.every(
      (response) => response.message === responses[0].message
    );
  }

  async consensus(data) {
    return this.performQuorum(data)
      .then((result) => {
        // console.log("Operation successful:", result);
        return result[0];
      })
      .catch((error) => {
        console.error("Operation failed:", error.message);
        throw error;
      });
  }

  discoverActiveReplicas(minPort, maxPort) {
    async function _replicaDiscoverability(basePort, maxPort) {
      const activePorts = [];

      for (let port = basePort; port <= maxPort; port++) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/ping`);
          if (response.ok) {
            const data = await response.json();
            if (data.message === "pong") {
              // The port is reachable, add it to the active list
              if (!activePorts.includes(port)) activePorts.push(port);
            }
          }
        } catch (error) {
          // The port is not reachable, remove it from the active list
          const index = activePorts.indexOf(port);
          if (index !== -1) {
            activePorts.splice(index, 1);
            console.log(`Port ${port} is no longer active`);
          }
        }
      }

      return activePorts;
    }

    _replicaDiscoverability(minPort, maxPort)
      .then((activePorts) => {
        this.replicaPorts = activePorts;
        return activePorts ?? [];
      })
      .catch((error) => {
        console.error("Error during replica discoverability:", error.message);
        this.replicaPorts = [];
        return [];
      });
  }
}

module.exports = {
  Quorum,
};
