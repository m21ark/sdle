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
    console.log("Data:", data.body)
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
    data.replicaPorts = [];
    if (this.consistentHashing === null || this.consistentHashing === undefined)
      return [0, 1, 2]; // todo change this

    // get the second argument of data.originalUrl
    let toHash = data.originalUrl.split("/")[2];

    // remove the part after the first %
    toHash = toHash.split("%")[0];

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

    for (const port of responsibleReplicaPorts) {
      try {
        const response = await this.sendRequestToReplica(port, data);
        responses.push(response);
        data.replicaPorts.push(port);
        // Check if quorum size is reached
        if (responses.length >= this.quorumSize) {
          if (this.areResponsesConsistent(responses, responsibleReplicaPorts)) {
            return responses;
          } // TODO: return the result of the operation
          console.error("Inconsistent responses");
          continue;
        }
      } catch (error) {
        // TODO: port that is falling should be informed of the changes occured while it was down,
        // const response = await this.sendHandoffUpdateRequest(port, data); Inform the handoff like this?
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

  areResponsesConsistent(responses, ports) {
    // TODO: implement this with state-based replication (hash comparison?)
    console.log("Quorum Responses:", responses);
    if (responses[0].success) return true; // TODO: Check why there are times that it receives a success response with no data
    
    // Create a set to keep track of unique commit hashes
    const uniqueCommits = {};

    // Iterate through each response and add unique commit hashes to the set
    responses.forEach((response) => {
      response.forEach((commit) => {
        uniqueCommits[commit.commit_hash] = commit.commit_data;
      });
    });

    // Create a new list for each response with the commits that are not in the original response
    const missingCommits = responses.map((response) => {
      const newCommits = Object.keys(uniqueCommits).filter(
        (commitHash) => !response.some((commit) => commit.commit_hash === commitHash)
      );
    
      return newCommits.map((commitHash) => ({
        commit_hash: commitHash,
        commit_data: uniqueCommits[commitHash] || '',
      }));
    });

    // Output the results
    console.log("Unique Commits Set:", Array.from(uniqueCommits));
    console.log("List of Lists with Unique Commits:", missingCommits);

    // If there are at least this.consensusSize lists that are empty, means that they are updated and there is consensus
    const numberOfEmptyLists = missingCommits.filter((list) => list.length === 0).length;
    if (numberOfEmptyLists >= this.consensusSize) {
      console.log("Consensus reached");
      return true;
    }

    // Else, we need to update the replicas with the missing commits
    console.log("Consensus not reached, updating replicas");
    
    // Iterate through each list of missing commits
    for (let i = 0; i < missingCommits.length; i++) {
      const missingCommitsList = missingCommits[i];
      const port = ports[i];

      // If the list is empty, means that there is consensus for this list
      if (missingCommitsList.length === 0) continue;

      // Else, we need to update the replica with the missing commits
      console.log(`Updating replica ${port} with missing commits:`, missingCommitsList);
      //await this.sendHandoffUpdateRequest(port, missingCommitsList);
    }
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
