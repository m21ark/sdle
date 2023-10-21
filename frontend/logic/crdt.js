
export class GCounter {
    constructor(id) {
        this.counts = new Map();
        this.id = id;
    }

    increment() {
        this.counts += 1;
    }

    local() {
        return this.counts.get(this.id);
    }

    value() {
        return this.counts.reduce((a, b) => a + b, 0);
    }

    join(other) { // TODO: Mudar a logica para ficar como um rescursive reset map
        for (const [id, count] of other.counts) {
            if (!this.counts.has(id)) {
                this.counts.set(id, 0);
            }
            const currentCount = this.counts.get(id);
            this.counts.set(id, Math.max(currentCount, count));
        }
    }

}

export class PNCounter {
    constructor(id) {
        this.positive = new GCounter(id);
        this.negative = new GCounter(id);
    }

    increment() {
        // Increment the positive count for the current replica
        this.positive.increment();
    }

    decrement() {
        // Increment the negative count for the current replica
        this.negative.increment();
    }

    local() {
        // Return the local value of the PNCounter
        return this.positive.local() - this.negative.local();
    }

    join(other) {
        // Merge the positive and negative counts from another PNCounter
        this.positive.join(other.positive);
        this.negative.join(other.negative);
    }

    value() {
        // Calculate the overall value by subtracting the negative count from the positive count
        const replicaId = getReplicaId(); // Implement this function as needed
        const positiveCount = this.positive.get(replicaId) || 0;
        const negativeCount = this.negative.get(replicaId) || 0;
        return positiveCount - negativeCount;
    }
}

