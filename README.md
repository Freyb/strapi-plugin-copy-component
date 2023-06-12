# Strapi plugin strapi-plugin-copy-component

A Strapi plugin that allows you to copy components from another entity.

## Installation

```bash
# using yarn
yarn add strapi-plugin-copy-component

# using npm
npm install strapi-plugin-copy-component --save
```

Then in your `config/plugins.js`:
```js
module.exports = ({ env }) => ({
  // ...
  'copy-component': {
    config: {
      contentTypes: [
        'api::mycollection.mycollection',
        {
          uid: 'api::mycollection2.mycollection2',
          source: [
            'api::mycollection2.mycollection2',
            'api::mycollection3.mycollection3',
          ],
        }
      ]
    }
  }
  // ...
});
```

`contentTypes` can contain strings or objects:
- string: If you want to allow your admin users to copy components to an entity from another entity in the same collection:
```js
contentTypes: [
  'api::blogpost.blogpost'
]
```
- object: If you want to allow your admin users to copy components to an entity from entities in a different collection:
```js
contentTypes: [
  {
    uid: 'api::navlink.navlink',
    source: [
      'api::navlink.navlink',
      'api::footerlink.footerlink',
    ],
  }
]
```

![](https://raw.githubusercontent.com/Freyb/strapi-plugin-copy-component/main/images/sidebar_button.png)