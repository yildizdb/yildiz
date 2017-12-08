# Controlling Access and Prefixes

There are multiple ways to control resource access
as well as allowed prefixes, with the help of the config's `access` field.

* access control can only be used with the http-server
* per default, if the access field is not defined it wil be set to `*`
* the wildcard `*` allows any access (requires no token), as well as any prefix
* if not set to the wildcard, the access field can **only** be set to an object,
    where the keys represent the prefix names and the values represent the
    allowed tokens for the prefix.
* the values can be wildcards or arrays of tokens (strings)
* tokens must be sent in the `authorization` header
* below are a few example configurations
* bad prefixes will result in `403` http responses
* bad tokens will result in `401` http responses

## Example Access Configurations

### Allow any prefix, for any token

```javascript
const config = {
    access: "*"
};
```

### Allow any prefix, for specific token(s)

```javascript
const config = {
    access: {
        "*": ["12313123", "123123123123"]
    }
};
```

### Allow any token, access to specific prefixes

```javascript
const config = {
    access: {
        "bla": "*",
        "blup": "*"
    }
};
```

### Prefxies, Tokens and wildcards can be combined

```javascript
const config = {
    access: {
        "bla": "*",
        "blup": ["123123123", "123123"],
        "*": ["admintoken"]
    }
};
```