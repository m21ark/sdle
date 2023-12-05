class Quorum {
  constructor(quorumSize, consensusSize, replicaPorts = []) {
    this.replicaPorts = replicaPorts;
    this.consensusSize = consensusSize;
    this.quorumSize = quorumSize;
  }

  setConsistentHashing(consistentHashing) {
    this.consistentHashing = consistentHashing;
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
    console.log("Sending request to replica:", url);
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

    if (this.consistentHashing === null || this.consistentHashing === undefined)
      return [0, 1, 2]; // todo change this

    // get the second argument of data.originalUrl
    let toHash = data.originalUrl.split("/")[2];

    const preferenceList = this.consistentHashing.getNextNNodes(
      toHash,
      this.quorumSize
    ); // TODO: change for sloppy quorum
    const responsibleReplicaPorts =
      this.consistentHashing.getNodesFromHashes(preferenceList);
    console.log(
      "Responsible replicas:",
      responsibleReplicaPorts,
      "for hash:",
      toHash
    );
    /*
      O stor disse uma coisa diferente do sloopy quorum. 
      Disse para termos um quorum fixo e se n houvesse consenso para termos pena.


      Aqui para fazer o sloopy quorum vamos ter de fazer:
        - o preferenceList vai ter de ter mais réplicas do que 
          ..... o quorumSize para ir buscar os nodes dps das falhas, talvez dé para fazer com iteradores da RBTree... ou passar um valor maior para o getNextNNodes
        - aqui é que vamos ver se o servidor está down ou não, e temos de iterar sobre o preferenceList até termos o quorumSize
        - Um nó que falhe vai ter de ser informado das mudanças que aconteceram pelo nó que o substitui enquanto ele esteve down
        
        
        - "all read and write operations are performed on the first N healthy nodes from
        the preference list, which may not always be the first N nodes
        encountered while walking the consistent hashing ring." -> o pk de preferenceList ter de ter mais réplicas do que o quorumSize


    */
    for (const port of responsibleReplicaPorts) {
      try {
        const response = await this.sendRequestToReplica(port, data);
        responses.push(response);

        // Check if quorum size is reached
        if (responses.length >= this.quorumSize) {
          if (this.areResponsesConsistent(responses)) {
            return responses;
          } // TODO: return the result of the operation
          console.error("Inconsistent responses");
          continue;
        }
      } catch (error) {
        // TODO: port that is falling should be informed of the changes occured while it was down,
        // sloppy quorum should take the next node in the ring and use to store the data
        console.error(error.message);
        // Continue with the next replica in case of failure
      }
    }

    throw new Error("Quorum not reached");
  }

  async sendHandoffUpdateRequest(recipientNode, updateData) {
    const handoffPort = 5600;
    try {
      const response = await fetch(`http://localhost:${handoffPort}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientNode,
          updateData,
        }),
      });

      const data = await response.json();
      if (!data.success)
        console.error("Handoff update request was not success:", data.error);
    } catch (error) {
      console.error("Error sending update request:", error.message);
    }
  }

  async sendHandoffDeliverHintsRequest(recipientNode) {
    const handoffPort = 5600;
    try {
      const response = await fetch(
        `http://localhost:${handoffPort}/deliver_hints`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientNode,
          }),
        }
      );

      const data = await response.json();
      if (!data.success)
        console.error("Handoff delivery response was not success:", data.error);
    } catch (error) {
      console.error("Error sending deliver hints request:", error.message);
    }
  }

  areResponsesConsistent(responses) {
    // TODO: implement this with state-based replication (hash comparison?)
    console.log("Responses:", responses);
    console.log("Message: ", responses[0].message)
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
