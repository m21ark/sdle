import { PNCounter } from './crdt.js';



class ShoppingList {


    constructor(prod, commits, commitTimeline) {
        this.products = new Map(); // Map product names to PNCounters
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
        const productCounter = this.products.get(productName);
        productCounter.increment(quantity);
    }

    removeProduct(productName, quantity) {
        if (this.products.has(productName)) {
            const productCounter = this.products.get(productName);
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

    serialize() {
        // Serialize the shopping list 
        return JSON.stringify(Array.from(this.products));
    }

    deserialize(serialized) {
        // Deserialize the shopping list
        //this.products = new Map(JSON.parse(serialized));
        //
        // TODO: deserialize the shopping list ... counter etc
        //
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

    changesAfter(commitHash) {
        // Return a new ShoppingList with the changes after the given commit hash
        const newShoppingList = new ShoppingList();
        const commitedList = this.commits.get(commitHash);

        for (const [productName, counter] of this.products) {
            if (!commitedList.products.has(productName)) {
                newShoppingList.products.set(productName, counter);
            } else {
                const commitedCounter = commitedList.products.get(productName);
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

        return newShoppingList;
    }


    commitChanges(commitHash, changes) {
        // Commit changes to the shopping list
        this.commits.set(commitHash, changes.clone());
        // localStorage.setItem('shoppingList', JSON.stringify(Array.from(this.commits)));
        this.commitTimeline.push(commitHash);
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
        for (const commitHash of commitHashes) {
            const changes = this.commits.get(commitHash);
            this.merge(changes);
        }
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
        let otherChanges;
        if (other.commitTimeline[other.commitTimeline.length - 1] == this.commitTimeline[this.commitTimeline.length - 1]) {
            otherChanges = other.changesAfter(other.commitTimeline[other.commitTimeline.length - 1]); // the other changes are the ones after the last commit
        } else {
            otherChanges = other.getAllChanges(this.commitTimeline[this.commitTimeline.length - 1]); // the other changes are the ones after the last commit
            commitHash = other.commitTimeline[other.commitTimeline.length - 1]; // set the history to the other commit hash recent one
        }

        this.commitChanges(commitHash, newChanges); // WE COMMIT our changes TO OURSELVES
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
    }
}



// Example usage:

const replica1 = new ShoppingList();
const replica2 = new ShoppingList();
// 
replica1.addProduct('Apples', 3);
replica1.addProduct('Bananas', 2);
// 
replica2.addProduct('Bananas', 1);
replica2.addProduct('Apples', 3);
replica2.removeProduct('Apples', 2);
// 
// Merge the two replicas
replica1.merge(replica2);
replica2.merge(replica1);
// 
console.log('Replica 1:');
replica1.showList();
console.log('Replica 2:');
replica2.showList();


replica1.removeFromList("Apples");
replica1.addProduct("Bananas", 1);

replica2.addProduct("Apples", 1);

console.log(replica2.commits)

replica1.merge(replica2);


//replica2.merge(replica1);
//
//console.log('Replica 1:');
//replica1.showList();
//console.log('Replica 2:');
//replica2.showList();



// const shoppingList = new ShoppingList();
// shoppingList.addProduct('Apples', 3);
// shoppingList.addProduct('Bananas', 2);
// 
// shoppingList.showList();
// 
// const commitHash = shoppingList.commitHash();
// shoppingList.commitChanges(commitHash);
// 
// shoppingList.addProduct('Bananas', 1);
// shoppingList.removeProduct('Apples', 2);
// 
// const dShopping = shoppingList.changesAfter(commitHash);
// 
// 
// dShopping.showList();
// const replica1 = new ShoppingList();
// const replica2 = new ShoppingList();
// 
// replica1.addProduct('Apples', 3);
// replica1.addProduct('Bananas', 2);
// 
// replica2.addProduct('Bananas', 1);
// replica2.removeProduct('Apples', 2);
// 
// // Merge the two replicas
// replica1.merge(replica2);
// replica2.merge(replica1);
// 
// console.log('Replica 1:');
// replica1.showList();
// console.log('Replica 2:');
// replica2.showList();
// 
// // Commit changes to the shopping list
// const commitHash1 = replica1.commitChanges();
// 
// replica1.addProduct('Bananas', 10);
// 
// 