# SDLE

## How to run frontend

On the first run, or after making changes to the `package.json` file, run the command below to install the dependencies:

```js
npm install
```

To compile (on root directory):

```js
npm start buid
```

To clean (on root directory):

```js
npm start clean
```

## How to run backend

The backend just creates the routes needed to access and manipulate the database. You need to create the `database.db` file first by executing:

```sql
sqlite3 database.db # inside /db

> .read criar.sql
> .read povoar.sql
```

```py
python3 backend.py
```
