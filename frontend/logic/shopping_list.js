import { PNCounter } from './crdt.js';



class ShoppingList {


    constructor(prod, commits, commitTimeline, name) {
        if (name != undefined) this.name = name;
        else this.name = "default";
        this.products = new Map(); // Map product names to PNCounters
        this.dChanges = new Map(); // Map product names to PNCounters
        this.commits = new Map(); // Map commit hashes to ShoppingLists ... successfully identifying a merge
        this.commitTimeline = []; // List of commit hashes in chronological order
        if (prod != undefined && commits != undefined && commitTimeline != undefined) {
            this.products = prod; // Map product names to PNCounters
            this.commits = commits; // Map commit hashes to ShoppingLists ... successfully identifying a merge
            this.commitTimeline = commitTimeline; // List of commit hashes in chronological order
        } else {

            this.products = new Map(); // Map product names to PNCounters
            this.commits = new Map(); // Map commit hashes to ShoppingLists ... successfully identifying a merge
            this.commitTimeline = []; // List of commit hashes in chronological order

            // TODO: n é preciso manter todas as versoes do shopping list ... so a ultima com cada um dos nos (server e clients se quisermos fazer peer to peer )
            this.commits.set("FIRST_COMMIT", new ShoppingList(new Map(), new Map(), []));
            this.commitTimeline.push("FIRST_COMMIT");
        }
    }

    commitHash() {
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36).substring(4, 15);
    }

    addProduct(productName, quantity) {
        if (!this.products.has(productName)) {
            this.products.set(productName, new PNCounter());
        }
        if (!this.dChanges.has(productName)) this.dChanges.set(productName, new PNCounter());

        const productCounter = this.products.get(productName);
        productCounter.increment(quantity);
        this.dChanges.get(productName).increment(quantity);
    }

    removeProduct(productName, quantity) {
        if (this.products.has(productName)) {
            const productCounter = this.products.get(productName);
            productCounter.decrement(quantity);
        }
        if (this.dChanges.has(productName)) {
            const productCounter = this.dChanges.get(productName);
            productCounter.decrement(quantity);
        }
    }

    getQuantityToBuy(productName) {
        if (this.products.has(productName)) {
            const productCounter = this.products.get(productName);
            return productCounter.value();
        }
        return 0;
    }

    showList() { // TODO; add a name to the list
        for (const [productName, quantity] of this.products) {
            console.log(`${productName}: ${quantity.value()}`);
        }
    }


    fromJSON(json) {
        const parsed = JSON.parse(json);
        const products = new Map();
        const commits = new Map();
        const commitTimeline = parsed.commitTimeline;
        const dChanges = new Map();

        for (const [productName, quantity] of Object.entries(parsed.products)) {
            products.set(productName, new PNCounter());
            if (quantity > 0) products.get(productName).increment(quantity);
            else if (quantity < 0) products.get(productName).decrement(-quantity);
        }
        for (const [commitHash, commit] of Object.entries(parsed.commits)) {
            commits.set(commitHash, Object.setPrototypeOf(commit, ShoppingList.prototype));
        }
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

        try {
            for (const [productName, counter] of this.products) {
                serializedProducts[productName] = counter.value();
            }
        } catch (error) {
            //console.log(error);
        }
        try {
            for (const [commitHash, commit] of this.commits) {
                serializedCommits[commitHash] = commit.toJSON();
            }
        } catch (error) {
            //console.log(error);
        }
        try {
            for (const [productName, counter] of this.dChanges) {
                dChanges[productName] = counter.value();
            }
        }
        catch (error) {
            //console.log(error);
        }


        return {
            name: this.name,
            products: serializedProducts,
            commits: serializedCommits,
            dChanges: dChanges, // TODO: see if we can remove dchanges
            commitTimeline: this.commitTimeline,
        };
    }

    serialize() {
        return JSON.stringify(this);
    }
    deserialize(serialized) {
        return this.fromJSON(serialized);
    }

    hasChanges(commitHash) {
        const commitedList = this.commits.get(commitHash);

        for (const [productName, counter] of this.products) {
            if (!commitedList.products.has(productName)) {
                return true;
            } else {
                const commitedCounter = commitedList.products.get(productName);
                const diff = counter.value() - commitedCounter.value();
                if (diff !== 0) {
                    return true;
                }

            }
        }

        return false;
    }

    getCommitsUntil(commitHash) {
        // Return a list of all commits until the given commit hash
        const index = this.commitTimeline.indexOf(commitHash);
        return this.commitTimeline.slice(0, index + 1);
    }

    getProductChanges(commitHashList) {
        let productsList = new Map();
        for (const commitHash of commitHashList) {
            const commitChanges = this.commits.get(commitHash);
            for (const [productName, counter] of commitChanges.products) {
                if (!productsList.has(productName)) {
                    productsList.set(productName, new PNCounter());
                }
                const productCounter = productsList.get(productName);
                productCounter.join(counter);
            }
        }
        return productsList;
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

    clone() {
        // Clone the shopping list
        const newShoppingList = new ShoppingList();

        let newProducts = new Map();
        for (const [productName, counter] of this.products) {
            newProducts.set(productName, counter.clone());
        }

        newShoppingList.products = newProducts;
        newShoppingList.commits = new Map([...this.commits]);
        newShoppingList.commitTimeline = [...this.commitTimeline];

        const dChanges = new Map();
        for (const [productName, counter] of this.dChanges) {
            dChanges.set(productName, counter.clone());
        }
        newShoppingList.dChanges = dChanges;

        return newShoppingList;
    }


    commitChanges(commitHash, changes) {
        // Commit changes to the shopping list
        this.commits.set(commitHash, changes.clone());
        // localStorage.setItem('shoppingList', JSON.stringify(Array.from(this.commits)));
        this.commitTimeline.push(commitHash);
        this.dChanges = new Map();

        return commitHash; // TODO: commit changes should be in cache and be serialized back .... still need to do the serialization part
    }

    requestLastCommitHash() {
        // Request the last commit hash from the server
    }

    sync() {
        // Sync the shopping list with the server
        // check the server last commit hash ... if there are local changes send them to the server so it can merge them ... merge the server changes with the local ones

        // if (hasChanges(serverLastHash)) 

        if (this.hasChanges(this.commitTimeline[this.commitTimeline.length - 1])) { // TODO: this is only true if there is no p2p
            // send changes to server
            const changes = this.changesAfter(this.commitTimeline[this.commitTimeline.length - 1]);
            // ...
        }
        // get server changes
        let serverHasChanges = this.requestLastCommitHash() == this.commitTimeline[this.commitTimeline.length - 1];
        if (serverHasChanges) {
            // merge server changes
            // ... request server changes since the last commit hash


        }
    }

    getAllFollowingCommits(commitHash) {
        // Return a list of all commits after the given commit hash
        const index = this.commitTimeline.indexOf(commitHash);
        return this.commitTimeline.slice(index + 1);
    }

    mergeListOfCommits(commitHashes) {
        // Merge a list of commits
        const changesS = new ShoppingList();
        for (const commitHash of commitHashes) {
            const changes = this.commits.get(commitHash);
            changesS.merge(changes);
        }
        return changesS;
    }

    getAllChanges(hash) {
        // Return a list of all changes after the given commit hash
        const all_following_commits = this.getAllFollowingCommits(hash);

        const changes = new ShoppingList();
        for (const commitHash of all_following_commits) {
            const commitChanges = this.commits.get(commitHash);
            changes.merge(commitChanges);
        }
        return changes;
    }

    merge(other) {
        // Merge product counters from another ShoppingList
        let newChanges = this.changesAfter(this.commitTimeline[this.commitTimeline.length - 1]); // the new changes are the ones after the last commit
        // check if other has changes after the last commit
        let commitHash = this.commitHash();
        let commitAgreement = false;
        let otherChanges;


        if (other.commitTimeline[other.commitTimeline.length - 1] == this.commitTimeline[this.commitTimeline.length - 1]) {
            otherChanges = other.changesAfter(other.commitTimeline[other.commitTimeline.length - 1]); // the other changes are the ones after the last commit
        } else {
            otherChanges = other.getAllChanges(this.commitTimeline[this.commitTimeline.length - 1]); // the other changes are the ones after the last commit
            commitHash = other.commitTimeline[other.commitTimeline.length - 1]; // set the history to the other commit hash recent one
            commitAgreement = true;
        }


        let newHash = this.commitHash();
        if (commitAgreement) {
            other.commitChanges(newHash, newChanges); // WE COMMIT the other changes TO THE OTHER
            this.commitChanges(commitHash, otherChanges); // WE COMMIT the other changes TO OURSELVES
            this.commitChanges(newHash, newChanges); // WE COMMIT our changes TO OURSELVES
        } else {
            this.commitChanges(commitHash, newChanges); // WE COMMIT our changes TO OURSELVES
        }
        for (const [productName, counter] of otherChanges.products) {
            if (!this.products.has(productName)) {
                this.products.set(productName, new PNCounter());
            }
            const productCounter = this.products.get(productName);
            productCounter.join(counter);
        }

    }

    removeFromList(productName) {
        // Remove a product from the list
        this.products.set(productName, new PNCounter());
        this.dChanges.set(productName, new PNCounter());
    }
}

export { ShoppingList };


