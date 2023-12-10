class Quorum {
  constructor(quorumSize, consensusSize, replicaPorts = []) {
    this.replicaPorts = replicaPorts;
    this.consensusSize = consensusSize;
    this.quorumSize = quorumSize;
    this.downReplicas = [];
  }

  // set consistent hashing
  setConsistentHashing(consistentHashing) {
    this.consistentHashing = consistentHashing;
  }

  // get consistent hashing
  getQuorumSize() {
    return this.quorumSize;
  }

  // get replica ports
  getReplicaPorts() {
    return this.replicaPorts;
  }

  // get quorum size
  setQuorumSize(quorumSize) {
    this.quorumSize = quorumSize;
  }

  // set replica ports
  setReplicaPorts(replicaPorts) {
    this.replicaPorts = replicaPorts;
  }

  // get active replica count
  getReplicaActiveCount() {
    return this.replicaPorts.length;
  }

  // send async request to replica
  async sendRequestToReplica(port, data) {
    console.log("Data:", data.body);
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

  // perform quorum by sending requests to replicas
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
    );

    const responsibleReplicaPorts =
      this.consistentHashing.getNodesFromHashes(preferenceList);
    console.log(
      "Responsible replicas:",
      responsibleReplicaPorts,
      "for hash:",
      toHash
    );
    let duplicateVote = false;
    const promises = responsibleReplicaPorts.map(async (port) => {
      try {
        const response = await this.sendRequestToReplica(port, data);
        responses.push(response);
        data.replicaPorts.push(port);
      } catch (error) {
        if (data.method === "GET") {
          duplicateVote = true;
        } else {
          // TODO: port that is falling should be informed of the changes occured while it was down
          const response = await this.sendHandoffUpdateRequest(port, data);
          responses.push([response]); // TODO: handoff doesnt provide a response for quorum
          data.replicaPorts.push(5600); // TODO: hardcoded and wrong (?)
        }
      }
    });

    await Promise.all(promises);

    if (duplicateVote) {
      responses.push(responses[0]);
      data.replicaPorts.push(data.replicaPorts[0]);
    }

    // Check if quorum size is reached
    if (this.areResponsesConsistent(responses, data)) {
      return responses;
    } else {
      throw new Error("Quorum not reached");
    }
  }

  // if replica is down, send handoff request with the data and metadata
  async sendHandoffUpdateRequest(recipientNode, data) {
    const postData = {
      commit_data: JSON.parse(data.body.data),
      username: data.body.username,
      listName: decodeURIComponent(data.originalUrl.split("/")[2]),
      commitHash: data.originalUrl.split("/")[3],
    };

    const apiUrl = `http://localhost:5600/update`;

    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ node: recipientNode, data: postData }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Response from server:", data);
        return { success: true };
      })
      .catch((error) => {
        console.error("Error:", error);
        return { success: false };
      });
  }

  // if replica is back up, send handoff request to deliver hints to it
  async sendHandoffDeliverHintsRequest(recipientNode) {
    const handoffPort = 5600;
    try {
      const response = await fetch(
        `http://localhost:${handoffPort}/deliver_hints/${recipientNode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (!data.success)
        console.error("Handoff delivery response was not success:", data.error);
    } catch (error) {
      console.error("Error sending deliver hints request:", error.message);
    }
  }

  // check if responses are consistent to reach consensus
  areResponsesConsistent(responses, data) {
    const listName = data.originalUrl.split("/")[2];

    // If there are at least responses.consensusSize
    // successful responses, means that there is consensus
    const numberOfSuccessfulResponses = responses.filter(
      (response) => response.success
    ).length;
    if (numberOfSuccessfulResponses >= this.consensusSize) {
      console.log("Consensus reached");
      return true;
    }

    // Create a set to keep track of unique commit hashes
    const uniqueCommits = {};

    // Iterate through each response and add unique commit hashes to the set
    responses.forEach((response) => {
      response.forEach((commit) => {
        uniqueCommits[commit.commit_hash] = [
          commit.user_name,
          commit.commit_data,
        ];
      });
    });

    // Create a new list for each response with the
    // commits that are not in the original response
    const missingCommits = responses.map((response) => {
      const newCommits = Object.keys(uniqueCommits).filter(
        (commitHash) =>
          !response.some((commit) => commit.commit_hash === commitHash)
      );

      return newCommits.map((commitHash) => ({
        user_name: uniqueCommits[commitHash][0] || "",
        commit_hash: commitHash,
        commit_data: uniqueCommits[commitHash][1] || "",
      }));
    });

    // If there are at least this.consensusSize lists that are empty,
    // means that they are updated and there is consensus
    const numberOfEmptyLists = missingCommits.filter(
      (list) => list.length === 0
    ).length;
    if (numberOfEmptyLists >= this.consensusSize) {
      console.log("Consensus reached");
      return true;
    }

    // Else, we need to update the replicas with the missing commits
    console.log("Consensus not reached, updating replicas");

    const updatePromises = [];

    // Iterate through each list of missing commits
    for (let i = 0; i < missingCommits.length; i++) {
      const missingCommitsReplica = missingCommits[i];
      const port = data.replicaPorts[i];

      // If the list is empty, means that there is consensus for this list
      if (missingCommitsReplica.length === 0) continue;

      // Else, we need to update the replica with the missing commits
      console.log(
        `Updating replica ${port} with missing commits:`,
        missingCommitsReplica
      );

      missingCommitsReplica.forEach((commit) => {
        const updatePromise = this.sendRequestToReplica(port, {
          method: "POST",
          originalUrl: `/list/${listName}/${commit.commit_hash}`,
          body: {
            username: commit.user_name,
            data: commit.commit_data,
          },
        });
        updatePromises.push(updatePromise);
      });
    }

    return Promise.all(updatePromises)
      .then(() => {
        console.log("All replicas updated successfully");
        // Iterate through uniqueCommits and make the first response with all unique commits
        responses[0] = Object.keys(uniqueCommits).map((commitHash) => ({
          user_name: uniqueCommits[commitHash][0] || "",
          commit_hash: commitHash,
          commit_data: uniqueCommits[commitHash][1] || "",
        }));
        return true;
      })
      .catch((error) => {
        console.error("Error updating replicas:", error.message);
        return false;
      });
  }

  // perform quorum and reach consensus
  async consensus(data) {
    return this.performQuorum(data)
      .then((result) => {
        return result[0];
      })
      .catch((error) => {
        console.error("Operation failed:", error.message);
        throw error;
      });
  }

  // discover active replicas by sending ping requests to them in the given port range
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

    // Discover active replicas in the given port range
    _replicaDiscoverability(minPort, maxPort)
      .then((activePorts) => {
        // Get the ones that came up
        const upReplicas = activePorts.filter(
          (port) => !this.replicaPorts.includes(port)
        );
        // call hinted handoff
        for (const port of upReplicas) {
          console.log("Delivering hints to node", port);
          this.sendHandoffDeliverHintsRequest(port);
        }

        // Get the ones that went down
        this.downReplicas = this.replicaPorts.filter(
          (port) => !activePorts.includes(port)
        );

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
