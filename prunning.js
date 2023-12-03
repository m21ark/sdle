function findLastCommonCommit(lists) {
  const numLists = lists.length;
  
  if (numLists < 2) {
    console.error("ERROR: At least two lists are required for comparison.");
    return null;
  }

  const minCommitTimelineLength = Math.min(...lists.map(list => list.commitTimeline.length));

  let lastCommonCommitId = null;

  // Iterate through the commit timelines in reverse order
  for (let i = minCommitTimelineLength - 1; i >= 0; i--) {
    const commitIds = lists.map(list => list.commitTimeline[i]);

    // Check if all commit IDs are equal
    if (commitIds.every((commitId, index) => commitId === commitIds[0])) {
      lastCommonCommitId = commitIds[0];
      break;
    }
  }

  if (lastCommonCommitId) {
    // Prune older changes before the last common commit in each list
    lists.forEach(list => pruneOlderChanges(list, lastCommonCommitId));
  }

  return lastCommonCommitId;
}

function pruneOlderChanges(list, lastCommonCommitId) {
  // Identify the index of the last common commit in the commit timeline
  const index = list.commitTimeline.indexOf(lastCommonCommitId);

  if (index !== -1) {
    // Remove older commits and adjust the commit timeline
    list.commitTimeline = list.commitTimeline.slice(index);
    list.commits = Object.fromEntries(
      Object.entries(list.commits).slice(index)
    );
  }
}


class GroceryList {
  constructor() {
    this.commitTimeline = [];
    this.commits = {};
  }

  addCommit(commitId) {
    this.commitTimeline.push(commitId);
    this.commits[commitId] = {};
  }
}

// Create three mock grocery lists
const list1 = new GroceryList();
const list2 = new GroceryList();
const list3 = new GroceryList();

// Add some commits to the lists
list1.addCommit("commit1");
list1.addCommit("commit2");
list1.addCommit("commit3");

list2.addCommit("commit1");
list2.addCommit("commit2");
list2.addCommit("commit3");

list3.addCommit("commit1");
list3.addCommit("commit2");
list3.addCommit("commit3");

// Introduce a fork in list2
list2.addCommit("forkedCommit2");
list2.addCommit("forkedCommit3");

// Introduce a fork in list3
list3.addCommit("forkedCommit7");
list3.addCommit("forkedCommit8");

// Add some more commits to the lists after the fork
list1.addCommit("commit4");
list1.addCommit("commit5");

list2.addCommit("forkedCommit4");
list2.addCommit("forkedCommit5");

list3.addCommit("forkedCommit9");
list3.addCommit("forkedCommit10");

// Find the last common commit among all three lists
const lastCommonCommit = findLastCommonCommit([list1, list2, list3]);

if(lastCommonCommit !== null){
console.log(`Last common commit: '${lastCommonCommit}'`);

// Print the commit timelines after pruning
console.log("List 1 timeline after pruning:", list1.commitTimeline);
console.log("List 2 timeline after pruning:", list2.commitTimeline);
console.log("List 3 timeline after pruning:", list3.commitTimeline);
}else{
    console.log("No last common commit found")
}



