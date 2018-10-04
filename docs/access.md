# Controlling Access and Prefixes

There are multiple ways to control resource access
as well as allowed prefixes, with the help of the config's `access` field.
Access works with a combination of a prefix (similar to a username) and token (similar to a password) that are defined in a map in the config.

* access control can only be used with the HTTP server
* a client provides the prefix in the `x-yildiz-prefix` HTTP header
* the token should be provided in the `authorization` HTTP header
* per default, if the access field is not defined it will be set to `*`
* the wildcard `*` allows any access (requires no token), as well as any prefix
* if not set to the wildcard, the access field can **only** be set to an object,
    where the keys represent the prefix names and the values represent the
    allowed tokens for the prefix.
* the values can be wildcards or arrays of tokens (strings)
* tokens must be sent in the `authorization` header
* below are a few example configurations
* bad prefixes will result in `403` http responses
* bad tokens will result in `401` http responses
* tokens under the `*` will always overrule other tokens (they can access all prefixes)
* its also possible to set these via env variables, see below
* whenever possible you should add SSL to secure the traffic and keep the
tokens private
* do not expose YildizDB HTTP ports to the public directly

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

### Prefixes, Tokens and wildcards can be combined

```javascript
const config = {
    access: {
        "bla": "*",
        "blup": ["123123123", "123123"],
        "*": ["admintoken"]
    }
};
```

## Setting access keys and values with access variables

```sh
YILDIZDB_ACK_MYPREFIX=123
YILDIZDB_ACK_MYPREFIX=456
YILDIZDB_ACK_BLABLA=xyz
YILDIZDB_ACK_BLUP=*
```

will result in

```javascript
const config = {
    access: {
        myprefix: ["123", "456"],
        blabla: ["xyz"],
        blup: "*"
    }
};
```