# GraphQL Workshop
This workshop is intended to give you a brief overview of how to set up and work with GraphQL from both the client and the server. This is intended to walk through some core concepts, but every system is different and there are many ways to do GraphQL! The system you use may be slightly different than this, but should generally follow these concepts.

## Phase 0 - Prerequisites
This workshop uses `nodejs@8.x.x` and `yarn`. If you don't have them installed, please do so now:
* nodejs: I suggest using [nvm](https://github.com/nvm-sh/nvm#installation-and-update) for managing node versions
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
  nvm install 8
  nvm use 8
  ```
* yarn: You can use the [yarn install script](https://yarnpkg.com/en/docs/install)
  ```
  curl -o- -L https://yarnpkg.com/install.sh | bash
  ```

The server and client also need to be installed and built before starting:
* In the `client/` folder, run:
  ```
  yarn install
  yarn build
  ```
* In the root folder, run:
  ```
  yarn install
  ```

## Phase 1 - Setting up the server
The first piece you need before you can really dive into writing your own GraphQL is a server which can run it. 

* Install all the graphql server dependencies: 
  ```sh
  yarn add apollo-server-hapi@^2.6.3 graphql@^14.3.1
  ```
* Create a `schema.graphql` file in the root directory with the following dummy graphql:
  ```graphql
  type Query {
    example: String
  }
  ```
* In `server.js`, add the code to pull in your graphql file and setup the graphql server!
  ```javascript
  // In the top of the file with imports
  const apollo = require('apollo-server-hapi');
  const fs = require('fs')
  
  // After getting the server object, but before `server.start`
  const schema = fs.readFileSync('./schema.graphql')
  const apolloServer = new apollo.ApolloServer({
      typeDefs: schema.toString(),
      playground: true,
      introspection: true,
  })
  await apolloServer.applyMiddleware({
      app: server
  })
  ```

Once all of these steps are done, you can run `yarn start` in the root directory and navigate to http://localhost:8080/graphql to open up playground and see your example schema!

## Phase 2 - Implementing your schemas and resolvers
The next step in this process is to build schemas which match the data structure of your REST endpoints and then set up resolvers to retrieve that data. As it works out, both our REST endpoints have the same data structure. For the purpose of this workshop though, we are going to define different types for them.

### Determining your schemas
For the data from the `/api/rocks` endpoint: if you open devtools on the site, you'll notice that the response looks like this:
```json
{
  "items": [{
    "src": "someUrl",
    "order": 5
  }]
}
```

Given this, we can see that it's constructed from an `items` field that contains an array of objects which have both a string `src` and an int `order`.

From that we can build the types to match this understanding, giving us:
```graphql
type Query {
  rocks: Rocks!
}

type Rocks {
  items: [RocksItem!]!
}

type RocksItem {
  src: String!
  order: Int
}
```

For the `/api/lake` endpoint you will notice that the structure is the same! You can just create the same types, but replace "rocks" with "lake" for everything. The full resulting schema that you should be placing in your `schema.graphql` is:
```graphql
type Query {
  rocks: Rocks!
  lake: Lake!
}

type Rocks {
  items: [RocksItem!]!
}

type RocksItem {
  src: String!
  order: Int
}

type Lake {
  items: [LakeItem!]!
}

type LakeItem {
  src: String!
  order: Int
}
```

Now, if you run `yarn start` again and reload the GraphQL playground, you should be able to see the schemas you put in place! You will notice, however, that if you attempt to build a query to call the new query fields, it just returns `null`! This is because we don't have any resolvers defined to actually put data in our queries. This leads us into our next section:

### Building your resolvers
Since our schemas match our REST APIs, writing the resolvers should be very simple. The structure for the resolvers that you pass into the apollo server follows a very specific format:
```
{
  <TypeName>: {
    <FieldName>: (obj, args, context, info) => {
      // Resolver logic
    }
  }
}
```

As well, GraphQL has default functionality to pass information through and resolve things itself when you don't define resolvers. If your data already matches the structure of your schema and you don't need any extra handling, you will not need to define a resolver to handle that field.

Given all of this, when we look at our schema, we see that there are only two resolvers we need to handle: the `lake` and `rocks` fields on the `Query` type. In these places we will want to retrieve the data from the backend and return it. Once it is returned from here, the structure will match our schema and we need no more resolvers!

So, here's what we need to do:
* Create a `resolvers.js` file in the root directory and add the following code:
  ```javascript
  const rp = require('request-promise-native');

  module.exports = {
    Query: {
      lake: async (data, args, context, info) => {
        return JSON.parse(await rp('http://localhost:8080/api/backend/lake'))
      },
      rocks: async (data, args, context, info) => {
        return JSON.parse(await rp('http://localhost:8080/api/backend/rocks'))
      }
    }
  }
  ```
* In your `server.js` file, add the resolvers to your ApolloServer config with
  ```js
  resolvers: require('./resolvers.js'),
  ```

Now your queries will return actual data! `yarn start` your server again and run the following query in playground:
```
{
  rocks {
    items {
      src
      order
    }
  }
  lake {
    items {
      src
      order
    }
  }
}
```

You should see all the data populate through.

## Phase 3 - Integrating the client
Our server is now fully functional! Now we'll need to switch up the client to call the GraphQL endpoint for data.

* In the `client/` folder, install the dependencies: 
  ```
  yarn add apollo-boost@^0.4.2 react-apollo@^2.5.6 graphql@^14.3.1
  ```
* Create a file `client/src/graphql.js` with the client setup code:
  ```js
  import ApolloClient from "apollo-boost";

  export const client = new ApolloClient({
    uri: "http://localhost:8080/graphql",
  });
  ```
* Wrap the apollo provider around your app in `client/src/index.js`:
  ```js
  // Import the apollo provider and client at the top of the file
  import { ApolloProvider } from "react-apollo";
  import { client } from './graphql';

  // Wrap the <App /> render with ApolloProvider replacing the original render
  ReactDOM.render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
    document.getElementById('root'));
  ```
* In your `client/src/App.js`:
  * Add the graphql imports needed to run the queries:
    ```js
    import gql from "graphql-tag";
    import { Query } from "react-apollo";
    ```
  * Set up your Query and render for the `rocks` root query:
    ```js
    const Rocks = () => (
      <Query query={gql`
        {
          rocks {
            items {
              src
              order
            }
          }
        }`
      }>
        {({ loading, error, data }) => {
          if (loading) return "Loading...";
          if (error) return `Error! ${error.message}`;

          return (
            <div className="rocks">
              {data.rocks.items.map(rocksImg => (
                <img src={rocksImg.src} />
              ))}
            </div>
          );
        }}
      </Query>
    );
    ```
  * Set up the same thing for the `lake` query.
  * Replace the `image-wrap` div rendering with the calls to your new Rocks and Lake render functions:
    ```
    <div className="image-wrap">
      <Rocks />
      <Lake />
    </div>
    ```
  * Remove the fetch calls from the constructor.
* Lastly, from your `client/` folder, run `yarn build`.

**Congratulations!!** 

From your root folder, run `yarn start` again and now you can navigate to http://localhost:8080/app to see the app in action! If you open up dev tools, you will see it making the graphql calls! This concludes the basic parts of the workshop, but feel free to try out some of the extras further on!

# Advanced Topics
## Query Batching
One of the awesome things about GraphQL is that you can request a lot of things at once. In fact, the two separate queries we built earlier could just as easily be written as:
```
{
  rocks {
    items {
      src
      order
    }
  }
  lake {
    items {
      src
      order
    }
  }
}
```
If we did this, then we'd just combine our render sections and load it as a single component!

Sometimes though, your data is not related and is even built from different reusable components. In these cases, you wouldn't want to smoosh your GraphQL queries into a single one because then you'd have to custom write the queries for every use of those components. This is where query batching comes in handy.

With query batching, the client is set up to wait a small amount of time (10ms by default) after receiving a query to see if it gets any more. Once it is done waiting, it will take all the queries it received and send them to the server in an array. You will get back an array response in the same order and the client will resolve them back to their original query requests!

How to set it up:
* In your `client/` folder, remove apollo-boost with: 
  ```
  yarn remove apollo-boost
  ```
  * `apollo-boost` is a lightweight client and lacks a lot of the more advanced client features.
* In your `client/` folder, add the new client dependencies: 
  ```
  yarn add apollo-client@^2.6.2 apollo-cache-inmemory@^1.6.2 apollo-link-batch-http@^1.2.12
  ```
* Replace your original client with the new one using a BatchHttpLink and InMemoryCache in `client/src/graphql.js`:
  ```js
  import ApolloClient from "apollo-client";
  import { BatchHttpLink } from "apollo-link-batch-http";
  import { InMemoryCache } from 'apollo-cache-inmemory';

  const link = new BatchHttpLink({ uri: "/graphql" });

  export const client = new ApolloClient({
    link,
    cache: new InMemoryCache()
  });
  ```
* In your `client/` folder, run `yarn build` to rebuild the client code!

That's it! Now if you go into your root folder, run `yarn start`, and go to the app at http://localhost:8080/app you will see that it only calls the `/graphql` endpoint once now!

## Input Parameters
Sometimes part of your schemas need user input in order to function properly (similar to adding query parameters to a rest call). For this segment we will work through adding an input parameter to the schema and using it in the resolver to influence how data is returned.

You'll notice that when the page renders, the images are all jumbled up! This is because the backend is scrambling the pieces up before sending it back. What we'll be writing is a boolean input parameter which will tell the resolver whether or not to unscramble the image.

How to set it up:
* Add a boolean input parameter to the `items` field on the `Rocks` type in your `schema.graphql` file:
  ```
  items(shouldUnscramble: Boolean = false): [RocksItem!]!
  ```
  * We are putting the input on the `items` field instead of the `rocks` field on `Query` because we only want to run this operation if the user actually requests the items.
* Add a new resolver in `resolvers.js` for the `items` field of the `Rocks` type. This resolver should be added as another property on the module.exports object. It should look for the `shouldUnscramble` field on the `args` object and then if it's true, run a sort on the items data:
  ```js
  Rocks: {
    items: (data, args, context, info) => {
      if (args.shouldUnscramble) {
        data.items.sort((left, right) => (left.order - right.order))
      }
      return data.items
    }
  }
  ```
* In your `client/src/App.js`, update your `rocks` query to pass this input value in.
  ```
  items(shouldUnscramble: true)
  ```
* In your `client/` folder, run `yarn build` to rebuild your client code.

Now, from the root folder you can run `yarn start` and navigate to the app at http://localhost:8080/app and you should see the app load up with the `rocks` image unscrambled!

## Customizing your Context
The `context` object is the primary way in which request specific information is passed into your resolvers. Most of the time you don't need anything from the context, but should you need specific data or functionalities from the request, it's good to know how to set it up and add more things to it.

In the last topic, we unscrambled the `rocks` image, so in this one, we'll use a header passed in and a custom context to tell us to unscramble the `lake` image!

How to set it up:
* In your `server.js` file, set the `context` parameter on the `ApolloServer` construction to be a function which takes in the default context and returns a new object containing the headers.
  ```js
  context: (defaultContext) => {
      return {
          headers: defaultContext.request.headers
      }
  }
  ```
  * Your context can be anything and can include functions or even be an instance of a class!
* Add a new resolver in `resolvers.js` for the `items` field of the `Lake` type. This resolver should look for the `headers['x-should-unscramble']` field on the `context` object and then if it's true, run a sort on the items data:
  ```js
  Lake: {
    items: (data, args, context, info) => {
      if (context.headers['x-should-unscramble']) {
        data.items.sort((left, right) => (left.order - right.order))
      }
      return data.items
    }
  }
  ```
* In your `client/src/graphql.js` Add the header to the options of either: 
  * `ApolloClient` if you have NOT done the "Query Batching" topic.
  * `BatchHttpLink` if you HAVE done the "Query Batching" topic.
  ```js
  headers: {
    "x-should-unscramble": true
  }
  ```
* In your `client/` folder, run `yarn build` to rebuild the client code.

And you're done! Now, if you run `yarn start` from your root folder and navigate to the app at http://localhost:8080/app you will be able to see that the `lake` image has been unscrambled!
