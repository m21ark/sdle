# SDLE

## Description

This project aims the creation of a **Local-First Shopping List Application**.

### Performed Work

- **Local Data Persistence** - with no need to have internet connection
- **Cloud Component** - provides backup storage for user data and sharing.
- **Shopping List Creation and Management** - adding/removing lists and sharing using url
- **Collaborative Editing** - allowing multiple users to edit a list
- **CRDTs** - custom delta based CRDT to merge different/conflicting data and ensure consistency
- **Item Management** - adding/removing items quantities needed and checking when all are acquired
- **High Availability** - designed to support millions of users and to avoid data access bottlenecks
- **Data Independence** - independence between list, which are partitioned into different databases.
- **Load Balancing** - to ensure good use of resources and avoid bottlenecks

#### Other features

- **Hinted Handoff** - to ensure data availability
- **Proxy** - to ensure data availability and load balancing
- **DNS Server** - to ensure data availability and load balancing
- **Admin Panel** - to monitor the system
- **Garbage Collection** - to ensure data availability and load balancing

## Technologies

For the frontend, the team used `JavaScript`, `HTML` and `CSS`.
For the network and backend, the team used `Node.js` with `express` and `SQLite3`.

## Dependencies

On the first run, or after making changes to the `package.json` file, run the command below to install the dependencies:

```bash
npm install
```

## How to run

To run the application, run the command below:

```bash
npm run start
```

The application will be served on live server at:

- `http://localhost:9000` - for the client 1
- `http://localhost:9001` - for the client 2
- `http://localhost:9002` - for admin panel

## Troubleshooting

Sometimes the application is not stopped properly and the ports are still in use. To solve this problem, run the command below:

```bash
npm run kill
```

This command will kill all processes running.

### Ports used

For the emulation of a full network, the following ports are used:

Frontend:

- `9000` - client 1
- `9001` - client 2
- `9002` - admin panel

Network:

- `[4000-4002]` - proxies (3 instances)
- `5900` - DNS server

Backend:

- `[5500-5504]` - web workers (5 instances)
- `5600` - hinted handoff server

Replicas:

- `[5000-5004]` - replicas (5 instances)

**Note:** these values are the default ones.
