# node-simple-dns-proxy

A simple dns proxy with RFC2136 (nsupdate) support written in node.js


### Goals
The goal of this project was to build a quick, straightforward implementation of a dns proxy with the ability to re-map some records using standard dns managemnt tools.

The RFC2136 implementation is quite basic, it just works ;)


### Dependencies

To be quick I used a node.js package called native-dns that handle all the dns server/client managment and this allowed me to build the dns proxy very quickly!


### Improvements

This project can me improved in a lot of different ways:

- DNS records caching
- Better request timeout managment
- Logging support
- Zone managment
- Reorganize the code
- Testing
- Improve RFC2136 support

### Security Issues
It doesn't support key-based authentication yet and I don't plan to add it in short, everyone who can access the dns proxy can also override the dns records!
