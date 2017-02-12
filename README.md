## Create a react component
### Top level component
```
yo react-component Foo
```

Creates 3 files in the `./components/Foo` directory:
- Foo.js
- Foo.css
- package.json (to mark Foo.js as entry file for the Foo directory)

### Nested structure
```
yo react-component Foo Bar
```

Creates 3 files in the `./components/Foo/components/Bar` directory:
- Bar.js
- Bar.css
- package.json
