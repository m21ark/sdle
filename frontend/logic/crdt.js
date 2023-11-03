export class GCounter {
  constructor(id) {
    this.counts = new Map();
    this.id = id;
  }

  clone() {
    // Return a deep copy of the GCounter
    const newCounter = new GCounter(this.id);
    newCounter.counts = new Map();
    for (const [id, count] of this.counts) newCounter.counts.set(id, count);
    return newCounter;
  }

  increment(quantity) {
    // Increment the count for the current replica
    if (!this.counts.has(this.id)) this.counts.set(this.id, quantity || 1);
    else this.counts.set(this.id, this.counts.get(this.id) + (quantity || 1));
  }

  local() {
    // Return the local value of the GCounter
    return this.counts.get(this.id);
  }

  value() {
    // Return the value of the GCounter (sum of all replicas)
    let res = 0;
    for (const [_, count] of this.counts) res += count;
    return res;
  }


  join(other) {
    // Recursive Reset Map
    for (const [id, count] of other.counts) {
      if (!this.counts.has(id)) this.counts.set(id, 0);
      const currentCount = this.counts.get(id);
      this.counts.set(id, currentCount + count);
    }
  }
}

export class PNCounter {
  constructor(id) {
    this.positive = new GCounter(id);
    this.negative = new GCounter(id);
  }

  clone() {
    // Return a deep copy of the PNCounter
    const newCounter = new PNCounter();
    newCounter.positive = this.positive.clone();
    newCounter.negative = this.negative.clone();
    return newCounter;
  }

  increment(quantity) {
    // Increment the positive count for the current replica
    this.positive.increment(quantity);
  }

  decrement(quantity) {
    // Increment the negative count for the current replica
    this.negative.increment(quantity);
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
    // Return the value of the PNCounter
    return this.local();
  }
}
