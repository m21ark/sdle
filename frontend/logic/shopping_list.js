import {PNCounter} from './crdt.js';

class ShoppingList {
    constructor() {
        this.products = new Map(); // Map product names to PNCounters
    }

    addProduct(productName, quantity) {
        if (!this.products.has(productName)) {
            this.products.set(productName, new PNCounter());
        }
        const productCounter = this.products.get(productName);
        productCounter.increment();
    }

    removeProduct(productName, quantity) {
        if (this.products.has(productName)) {
            const productCounter = this.products.get(productName);
            productCounter.decrement();
        }
    }

    getQuantityToBuy(productName) {
        if (this.products.has(productName)) {
            const productCounter = this.products.get(productName);
            return productCounter.value();
        }
        return 0;
    }

    merge(other) {
        // Merge product counters from another ShoppingList
        for (const [productName, counter] of other.products) {
            if (!this.products.has(productName)) {
                this.products.set(productName, new PNCounter());
            }
            const productCounter = this.products.get(productName);
            productCounter.merge(counter);
        }
    }
}

// Utility function to get the replica ID (you need to implement this)
function getReplicaId() {
    return Math.floor(Math.random() * 1000);
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
console.log(replica1.products);

console.log('Replica 2:');
console.log(replica2.products);

