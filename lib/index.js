'use strict';

import { ApolloLink, Observable } from 'apollo-link';
import { print } from 'graphql/language/printer';

const NesLink = class NesLink extends ApolloLink {
  constructor (client) {
    super();
    this.client = client;
  }

  async request (operation) {
    if (!this.client._ws) {
      try {
        await this.client.connect();
      } catch (err) {
        console.log(err);
      }
    }

    const payload = {
      operationName: operation.operationName,
      variables: operation.variables,
      query: print(operation.query)
    };

    const promise = this.client.request({
      path: 'graphql',
      method: 'POST',
      payload
    });

    promise.subscribe = async (observerOrNext, onError, onComplete) => {
      const observer = getObserver(observerOrNext, onError, onComplete);
      try {
        const result = await this.client.subscribe(operation);
        if (observer.next) {
          observer.next(result);
        }
        if (observer.complete) {
          observer.complete();
        }
      } catch (err) {
        if (observer.error) {
          observer.error(err[0]);
        }
      }

      return {
        unsubscribe: async () => {
          await this.client.unsubscribe(operation);
        }
      };
    };

    return promise;
  }
};

function getObserver (observerOrNext, error, complete) {
  if (typeof observerOrNext === 'function') {
    return {
      next: function (v) { return observerOrNext(v); },
      error: function (e) { return error && error(e); },
      complete: function () { return complete && complete(); }
    };
  }
  return observerOrNext;
}

export { NesLink }
