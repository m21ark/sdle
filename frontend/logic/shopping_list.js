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

    commitChanges() {
        // Commit changes to the shopping list
        const commitHash = this.commitHash();
        this.commits.set(commitHash, this);
        console.log('Commit hash:', commitHash);
        console.log('Commit:', this.commits.get(commitHash));
        this.commits.get(commitHash).showList();
        return commitHash;
    }

    merge(other) {
        // Merge product counters from another ShoppingList
        for (const [productName, counter] of other.products) {
            if (!this.products.has(productName)) {
                this.products.set(productName, new PNCounter());
            }
            const productCounter = this.products.get(productName);
            productCounter.join(counter);
        }
    }
}



// Example usage:


const replica1 = new ShoppingList();
const replica2 = new ShoppingList();

replica1.addProduct('Apples', 3);
replica1.addProduct('Bananas', 2);

replica2.addProduct('Bananas', 1);
replica2.removeProduct('Apples', 2);

// Merge the two replicas
replica1.merge(replica2);
replica2.merge(replica1);

console.log('Replica 1:');
replica1.showList();
console.log('Replica 2:');
replica2.showList();


// Commit changes to the shopping list
const commitHash1 = replica1.commitChanges();

replica1.addProduct('Bananas', 10);

