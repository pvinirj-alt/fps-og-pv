import { setTimeout as delay } from 'node:timers/promises';

export class DeliveryQueue {
  constructor(store, payload, interval = 2500) {
    this.store = store;
    this.payload = payload;
    this.interval = interval;
    this.tail = Promise.resolve();
    this.nextDelivery = 0;
  }

  enqueue(member, explicitRetry = false) {
    if (member.user.bot || member.pending) return Promise.resolve('ignored');
    const guild = member.guild.id;
    const user = member.id;
    if (!this.store.claim(guild, user, explicitRetry)) {
      return Promise.resolve(this.store.status(guild, user));
    }
    const result = this.tail.then(async () => {
      await delay(Math.max(0, this.nextDelivery - Date.now()));
      // A rejoin event may remain in the queue after a member has left again.
      try {
        await member.guild.members.fetch({ user, force: true });
      } catch (error) {
        this.store.finish(guild, user, error.code === 10007 ? 'left' : 'uncertain');
        return error.code === 10007 ? 'left' : 'uncertain';
      }
      try {
        await member.send(this.payload());
        this.store.finish(guild, user, 'sent');
        return 'sent';
      } catch (error) {
        const state = error.code === 50007 ? 'blocked' : 'uncertain';
        this.store.finish(guild, user, state);
        // Deliberately omit raw HTTP errors, which can contain request details.
        console.warn(`DM ${state}; Discord code ${Number(error.code) || 'unknown'}`);
        return state;
      } finally {
        this.nextDelivery = Date.now() + this.interval;
      }
    });
    this.tail = result.catch(() => {});
    return result;
  }
}
