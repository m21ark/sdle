import {PNCounter} from './crdt.js';

class ShoppingList {
    constructor() {
        this.products = new Map(); // Map product names to PNCounters
        this.commits = new Map(); // Map commit hashes to ShoppingLists ... successfully identifying a merge
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
        console.log('Shopping list:');
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

    changesAfter(commitHash) {
        // Return a new ShoppingList with the changes after the given commit hash
        const newShoppingList = new ShoppingList();
        for (const [hash, shoppingList] of this.commits) {
            if (hash > commitHash) {
                newShoppingList.merge(shoppingList);
            }
        }
        return newShoppingList;
    }


    commitChanges(commitHash) {
        // Commit changes to the shopping list
        this.commits.set(commitHash, this);
        localStorage.setItem('shoppingList', JSON.stringify(Array.from(this.commits)));
        return commitHash; // TODO: commit changes should be in cache and be serialized back .... still need to do the serialization part
    }

    merge(other) {
        // Merge product counters from another ShoppingList
        const commitHash = this.commitHash();
        for (const [productName, counter] of other.products) {
            if (!this.products.has(productName)) {
                this.products.set(productName, new PNCounter());
            }
            const productCounter = this.products.get(productName);
            productCounter.join(counter);
        }
        this.commitChanges(commitHash);
        other.commitChanges(commitHash);
    }
}



// Example usage:




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