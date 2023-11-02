export class GCounter {
  constructor(id) {
    this.counts = new Map();
    this.id = id;
  }

  clone() {
    const newCounter = new GCounter(this.id);
    newCounter.counts = new Map();
    for (const [id, count] of this.counts) {
      newCounter.counts.set(id, count);
    }

    return newCounter;
  }

  increment(quantity) {
    if (!this.counts.has(this.id)) {
      this.counts.set(this.id, quantity || 1);
    } else {
      this.counts.set(this.id, this.counts.get(this.id) + (quantity || 1));
    }
  }

  local() {
    return this.counts.get(this.id);
  }

  value() {
    let res = 0;
    for (const [id, count] of this.counts) {
      res += count;
    }
    return res;
  }

  join(other) {
    // TODO: Mudar a logica para ficar como um remove as rescursive reset map
    for (const [id, count] of other.counts) {
      if (!this.counts.has(id)) {
        this.counts.set(id, 0);
      }
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
    // same as local
    // Return the value of the PNCounter
    return this.positive.value() - this.negative.value();
  }

  clone() {
    const newCounter = new PNCounter();
    newCounter.positive = this.positive.clone();
    newCounter.negative = this.negative.clone();
    return newCounter;
  }
}
