const { response } = require("express");

class GarbageCollector {
  constructor() {
    this.replicaPorts = [];
  }

  async discoverActiveReplicas(minPort, maxPort) {
    try {
      const activePorts = await this.replicaDiscoverability(minPort, maxPort);
      this.replicaPorts = activePorts;
      return activePorts ?? [];
    } catch (error) {
      console.error("Error during replica discoverability:", error.message);
      this.replicaPorts = [];
      return [];
    }
  }

  async replicaDiscoverability(basePort, maxPort) {
    const activePorts = [];

    for (let port = basePort; port <= maxPort; port++) {
      try {
        const url = `http://127.0.0.1:${port}/ping`;
        const response = await fetch(url);
        if (response.status === 200) {
          const data = await response.json();
          if (data.message === "pong") {
            // The port is reachable, add it to the active list
            if (!activePorts.includes(port)) activePorts.push(port);
          }
        } else console.log(`Port ${port} is not reachable`);
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

  async getReplicasCommits(listName) {
    // replicasCommits is a Map of the form: PORT => [ {commitHash: ..., commitData: ...} ]
    const replicasCommits = new Map();

    for (const port of this.replicaPorts) {
      const response = await fetch(
        `http://127.0.0.1:${port}/list/${encodeURIComponent(listName)}`
      );

      if (response.status === 200) {
        const data = await response.json();
        replicasCommits.set(port, data);
      }
    }

    return replicasCommits;
  }

  async performGarbageCollection() {
    console.log("Discovering active replicas ...");

    this.replicaPorts = await this.discoverActiveReplicas(5000, 5005);

    if (!this.replicaPorts || this.replicaPorts.length === 0) {
      console.log("No active replicas found");
      return;
    }

    console.log("Active replicas found:", this.replicaPorts);

    if (this.replicaPorts.length === 1) {
      console.log("Only one active replica found. Nothing to do.");
      return;
    }

    console.log("Performing garbage collection...");

    console.log("Getting all lists ...");

    // get all lists
    let lists = new Set();

    for (const port of this.replicaPorts) {
      const response = await fetch(`http://127.0.0.1:${port}/lists`);

      if (response.status === 200) {
        const data = await response.json();
        data.forEach((list) => lists.add(list.list_name));
      }
    }

    if (lists.size === 0) {
      console.log("No lists to perform garbage collection on");
      return;
    }

    console.log("Found lists:", [...lists]);

    // for each list, perform garbage collection
    for (const listName of lists)
      await this.performGarbageCollectionOnList(listName);

    console.log("Finished garbage collection");
  }

  async performGarbageCollectionOnList(listName) {
    console.log("Performing garbage collection on list:", listName);

    // replicasCommits is a Map of the form: PORT => [ {commitHash: ..., commitData: ...} ]
    const replicasCommits = await this.getReplicasCommits(listName);

    // Sort commits by commit_hash
    const sortedReplicasCommits = new Map(
      [...replicasCommits.entries()].map(([port, commits]) => {
        return [
          port,
          commits
            .filter((commit) => commit.commit_hash) // Filter out commits without commitHash
            .sort((a, b) => a.commit_hash.localeCompare(b.commit_hash)),
        ];
      })
    );

    // Find common commit hashes
    const firstKeyCommits = sortedReplicasCommits.values().next().value || [];
    const common_hashes = [];

    for (const commit of firstKeyCommits) {
      if (commit && commit.commit_hash !== undefined) {
        const commitHashToCheck = commit.commit_hash;
        const isCommonCommit = [...sortedReplicasCommits.keys()].every((key) =>
          sortedReplicasCommits
            .get(key)
            .some(
              (otherCommit) => otherCommit.commit_hash === commitHashToCheck
            )
        );
        if (isCommonCommit) common_hashes.push(commitHashToCheck);
        else break; // we found a commit that is not common to all replicas
      }
    }

    if (common_hashes.length === 0) {
      console.log("No common hashes found. Nothing to do.");
      return;
    }

    if (common_hashes.length === 1) {
      console.log("Only one common hash found. Nothing to do.");
      return;
    }

    console.log("Merging common hashes:", common_hashes);

    // Get commit_data for each common commit_hash
    const commonCommitDataMap = new Map();
    for (const commit of firstKeyCommits)
      if (common_hashes.includes(commit.commit_hash))
        commonCommitDataMap.set(commit.commit_hash, commit.commit_data);

    // Merge all common commit_data into a single object
    const mergedCommitData = Array.from(commonCommitDataMap.values()).reduce(
      (merged, commitData) => {
        const commitDataObj = JSON.parse(
          commitData.replace(/delta/g, '"delta"')
        );

        for (const key in commitDataObj.delta) {
          if (merged.delta.hasOwnProperty(key))
            merged.delta[key] += commitDataObj.delta[key];
          else merged.delta[key] = commitDataObj.delta[key];
        }

        return merged;
      },
      { delta: {} }
    );

    const lastCommonCommitHash = sortedReplicasCommits
      .values()
      .next()
      .value.slice(-1)[0]?.commit_hash;

    const mergedCommit = {
      commit_hash: lastCommonCommitHash,
      commit_data: JSON.stringify(mergedCommitData),
    };

    await this.sendMergedCommitToReplicas(
      listName,
      common_hashes,
      mergedCommit
    );

    console.log("Finished garbage collection on list:", listName);
  }

  async sendMergedCommitToReplicas(listName, common_hashes, mergedCommit) {
    console.log("Sending merged commit to replicas: ", mergedCommit);

    const sendRequests = this.replicaPorts.map(async (port) => {
      try {
        const response = await fetch(
          `http://127.0.0.1:${port}/list/${encodeURIComponent(listName)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              common_hashes: common_hashes,
              data: mergedCommit,
            }),
          }
        );

        const data = await response.json();

        if (response.status !== 200) {
          console.log("Error sending merged commit to replica:", data);
        }
      } catch (error) {
        console.error(error);
      }
    });

    await Promise.all(sendRequests);
  }
}

const garbageCollector = new GarbageCollector();
garbageCollector.performGarbageCollection(); // TODO Make this a cron job

// using this endpoint, get all commits for a list

/*
app.get("/list/:list_name", (req, res) => {
  const listName = req.params.list_name;

  let response = queryAll(
    "SELECT commit_hash, commit_data FROM commitChanges WHERE list_name = ?",
    [listName]
  );

  res.status(200).json(response);
});
*/
