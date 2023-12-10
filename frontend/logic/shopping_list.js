import { PNCounter } from "./crdt.js";

class ShoppingList {
  constructor(products, commits, commitTimeline, displayName = "default_name") {
    this.name = this.genUniqueNameID(displayName);

    this.products = new Map(); // Map product names to PNCounters
    this.dChanges = new Map(); // Map product names to PNCounters ... used to store the changes before commiting them
    this.commits = new Map(); // Map commit hashes to ShoppingLists ... successfully identifying a merge
    this.commitTimeline = []; // List of commit hashes in chronological order
    this.lastCommitRead = "FIRST_COMMIT";

    const boolDefined =
      products != undefined &&
      commits != undefined &&
      commitTimeline != undefined;

    // If the parameters are defined, use them else use the intialize new values
    if (boolDefined) {
      this.products = products;
      this.commits = commits;
      this.commitTimeline = commitTimeline;
    } else {
      this.products = new Map();
      this.commits = new Map();
      this.commitTimeline = [];


      // Create the first setup commit
      this.commits.set(
        "FIRST_COMMIT",
        new ShoppingList(new Map(), new Map(), [])
      );

      this.commitTimeline.push("FIRST_COMMIT");
    }
  }

  genUniqueNameID(listName) {
    const name = listName.replace("#", "").replace(" ", "");
    const hash = Math.random().toString(36).substring(2, 15);
    return `${name}#${hash}`;
  }

  clone() {
    // Return a deep clone of the shopping list
    const serialized = this.serialize();
    const clonedShoppingList = new ShoppingList();
    clonedShoppingList.fromJSON(serialized);
    return clonedShoppingList;
  }

  commitHashGen() {
    // Generate a commit hash based on the current time
    return Date.now().toString() + Math.random().toString(36).substring(2, 14);
  }

  addProduct(productName, quantity) {
    // Add a product to the list
    if (!this.products.has(productName))
      this.products.set(productName, new PNCounter());
    if (!this.dChanges.has(productName))
      this.dChanges.set(productName, new PNCounter());

    // update counters to quantity
    this.products.get(productName).increment(quantity);
    this.dChanges.get(productName).increment(quantity);
  }

  removeProduct(productName, quantity) {
    // Remove a product from the list
    if (this.products.has(productName))
      this.products.get(productName).decrement(quantity);
    if (this.dChanges.has(productName)) {
      this.dChanges.get(productName).decrement(quantity);
    } else {
      this.dChanges.set(productName, new PNCounter());
      this.dChanges.get(productName).decrement(quantity);
    }
  }

  removeFromList(productName) {
    let decrement = this.products.get(productName).value();
    this.products.get(productName).decrement(decrement);

    if (this.dChanges.has(productName)) {
      this.dChanges.get(productName).decrement(decrement);
    } else {
      this.dChanges.set(productName, new PNCounter());
      this.dChanges.get(productName).decrement(decrement);
    }
  }

  getQuantityToBuy(productName) {
    // Return the quantity of a product to buy
    if (this.products.has(productName))
      return this.products.get(productName).value();
    return 0;
  }

  showList() {
    // Print the list to the console
    console.log(`=========== Shopping list: '${this.name}' ===========`);
    for (const [productName, quantity] of this.products)
      console.log(`${productName}: ${quantity.value()} qnt`);
  }

  hasChanges(commitHash) {
    // Return true if dchanges has values inside it more recent than the given commit hash
    return this.dChanges.size > 0;
  }

  getProductChanges(commitHashList) {
    // Return a list of all product counters changes from a list of commits
    let productsList = new Map();

    for (const commitHash of commitHashList) {
      const commitChanges = this.commits.get(commitHash);

      // Ensuring the products property is a Map
      if (commitChanges.products[Symbol.iterator] !== "function")
        commitChanges.products = new Map();

      for (const [productName, counter] of commitChanges.products) {
        if (!productsList.has(productName))
          productsList.set(productName, new PNCounter());

        // Update the product counter
        const productCounter = productsList.get(productName);
        productCounter.join(counter);
      }
    }
    return productsList;
  }

  getCommitsUntil(commitHash) {
    // Return a list of all commits until the given commit hash
    const index = this.commitTimeline.indexOf(commitHash);
    return this.commitTimeline.slice(0, index + 1);
  }

  getCommitsAfter(commitHash) {
    // Return a list of all commits after the given commit hash
    const index = this.commitTimeline.indexOf(commitHash);
    return this.commitTimeline.slice(index + 1);
  }

  changesAfter(commitHash) {
    // Return a new ShoppingList with the changes after the given commit hash
    const newShoppingList = new ShoppingList();
    let commitsUnitl = this.getCommitsUntil(commitHash);

    const commitedList = this.getProductChanges(commitsUnitl);

    for (const [productName, counter] of this.products) {
      if (!commitedList.has(productName)) {
        newShoppingList.products.set(productName, counter);
      } else {
        const commitedCounter = commitedList.get(productName);
        const diff = counter.value() - commitedCounter.value();
        if (diff !== 0) {
          const newCounter = new PNCounter();
          if (diff > 0) {
            newCounter.increment(diff);
          } else {
            newCounter.decrement(-diff);
          }

          newShoppingList.products.set(productName, newCounter);
        }
      }
    }

    return newShoppingList;
  }

  commitChanges(commitHash, changes) {
    // Commit changes to the shopping list

    // if this.commits its not from map prototype return
    if (!(this.commits instanceof Map)) this.commits = new Map();

    // Commit and reset the dchanges
    this.commits.set(commitHash, changes.clone());
    this.commitTimeline.push(commitHash);
    this.dChanges = new Map();

    return commitHash;
  }

  mergeListOfCommits(commitHashList) {
    // Merge a list of commits
    const newList = new ShoppingList();
    for (const commitHash of commitHashList) {
      const changes = this.commits.get(commitHash);
      newList.merge(changes);
    }
    return newList;
  }

  getAllChanges(hash) {
    // Return a list of all changes after the given commit hash
    const commitsAfter = this.getCommitsAfter(hash);

    const changes = new ShoppingList();
    for (const commitHash of commitsAfter) {
      const commitChanges = this.commits.get(commitHash);
      changes.merge(commitChanges);
    }
    return changes;
  }

  mergeDeltaChanges(commitHash, dChangeList) {
    // Merge a list of dChanges
    for (const [productName, counter] of dChangeList.products) {
      if (!this.products.has(productName))
        this.products.set(productName, new PNCounter());

      const productCounter = this.products.get(productName);
      productCounter.join(counter);
    }
    this.commitTimeline.push(commitHash);
    this.commits.set(commitHash, dChangeList);
  }

  fromJSON(json) {
    const parsed = JSON.parse(json);
    const products = new Map();
    const commits = new Map();
    const commitTimeline = parsed.commitTimeline;
    const dChanges = new Map();

    // Load products
    for (const [productName, quantity] of Object.entries(parsed.products)) {
      products.set(productName, new PNCounter());
      if (quantity > 0) products.get(productName).increment(quantity);
      else if (quantity < 0) products.get(productName).decrement(-quantity);
    }

    // Load commits
    for (const [commitHash, commit] of Object.entries(parsed.commits)) {
      commits.set(
        commitHash,
        Object.setPrototypeOf(commit, ShoppingList.prototype)
      );
    }

    // Load dChanges
    for (const [productName, quantity] of Object.entries(parsed.dChanges)) {
      dChanges.set(productName, new PNCounter());
      if (quantity > 0) dChanges.get(productName).increment(quantity);
      else if (quantity < 0) dChanges.get(productName).decrement(-quantity);
    }

    this.name = parsed.name;
    this.products = products;
    this.commits = commits;
    this.commitTimeline = commitTimeline;
    this.dChanges = dChanges;
  }

  toJSON() {
    const serializedProducts = {};
    const serializedCommits = {};
    const dChanges = {};

    // Serialize products
    try {
      for (const [productName, counter] of this.products)
        serializedProducts[productName] = counter.value();
    } catch (error) { }

    // Serialize commits
    try {
      for (const [commitHash, commit] of this.commits)
        serializedCommits[commitHash] = commit.toJSON();
    } catch (error) { }

    // Serialize dChanges
    try {
      for (const [productName, counter] of this.dChanges)
        dChanges[productName] = counter.value();
    } catch (error) { }

    return {
      name: this.name,
      products: serializedProducts,
      commits: serializedCommits,
      dChanges: dChanges,
      commitTimeline: this.commitTimeline,
    };
  }

  serialize() {
    return JSON.stringify(this);
  }
  deserialize(serialized) {
    return this.fromJSON(serialized);
  }
}

export { ShoppingList };
