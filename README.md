# GitBook Custom Formatting Plugin

A custom GitBook plugin to modify formatting rules for your documentation.

## Installation

### Local Installation

1. The plugin is located in the `gitbook-plugin-custom-formatting` directory
2. Add it to your `book.json` using a relative path:

```json
{
  "plugins": ["hints", "url-embed", "./gitbook-plugin-custom-formatting"]
}
```

3. Install dependencies (if needed):

```bash
npm install
```

**Note:** For local plugins, you must use a relative path (starting with `./`) in the plugins array. GitBook will not find local plugins if you just use the plugin name.

### Configuration

No configuration is needed. Simply add the plugin to your `book.json`:

```json
{
  "plugins": ["hints", "url-embed", "./gitbook-plugin-custom-formatting"]
}
```

The markdown syntax fixes are automatically applied to all pages.

## Features

### Markdown Syntax Fixes

The plugin automatically fixes markdown syntax to match GitBook plugin requirements:

#### Embed Block Transformation

Transforms `{% embed %}` syntax to the correct `{% urlembed %}` format required by the `url-embed` plugin:

**Input:**

```markdown
{% embed url="https://www.youtube-nocookie.com/embed/XSMgZ4bM7hM?rel=0" %}
```

**Output:**

```markdown
{% urlembed %}
https://www.youtube-nocookie.com/embed/XSMgZ4bM7hM?rel=0
{% endurlembed %}
```

Supported formats:

- `{% embed url="..." %}`
- `{% embed url='...' %}`
- `{% embed url=... %}`
- `{% embed https://... %}`

#### Double Curly Brace Escaping

Automatically escapes `{{variable}}` syntax and wraps it in backticks to prevent GitBook parsing errors:

**Input:**

```markdown
Use {{myVariable}} in your template.
```

**Output:**

```markdown
Use `{{myVariable}}` in your template.
```

#### Content-Ref Transformation

Converts `{% content-ref %}` blocks to standard markdown links:

**Input:**

```markdown
{% content-ref url="path/to/page.md" %}
[Link Text](path/to/page.md)
{% endcontent-ref %}
```

**Output:**

```markdown
[Link Text](path/to/page.md)
```

If the content between the tags is empty, a link is automatically generated from the URL.

#### Stepper Block Transformation

Converts `{% stepper %}` blocks to standard markdown headings:

**Input:**

```markdown
{% stepper %}
{% step %}

#### Install Dependencies

Run npm install to get started.
{% endstep %}
{% step %}

#### Configure Settings

Edit the config file.
{% endstep %}
{% endstepper %}
```

**Output:**

```markdown
## Step 1: Install Dependencies

Run npm install to get started.

## Step 2: Configure Settings

Edit the config file.
```

#### Tabs Block Transformation

Converts `{% tabs %}` blocks to HTML `<details>/<summary>` collapsible sections:

**Input:**

```markdown
{% tabs %}
{% tab title="JavaScript" %}
console.log("Hello");
{% endtab %}
{% tab title="Python" %}
print("Hello")
{% endtab %}
{% endtabs %}
```

**Output:**

```html
<details>
  <summary>JavaScript</summary>

  console.log("Hello");
</details>

<details>
  <summary>Python</summary>

  print("Hello")
</details>
```

#### Columns Block Transformation

Converts `{% columns %}` blocks to markdown tables:

**Input:**

```markdown
{% columns %}
{% column %}

#### Column 1

Content for column 1
{% endcolumn %}
{% column %}

#### Column 2

Content for column 2
{% endcolumn %}
{% endcolumns %}
```

**Output:**

```markdown
| Column 1             | Column 2             |
| -------------------- | -------------------- |
| Content for column 1 | Content for column 2 |
```

#### Liquid Syntax Escaping (Page-Specific)

For pages containing Shopify Liquid code examples, the plugin escapes Liquid braces inside `<script>` and `<product-form>` tags to prevent GitBook from parsing them as template variables.

This feature is currently enabled for: `infinite-options/infinite-options-resolve-theme-app-extension-red-banner-on-preview.md`

## Customization

### Adding More Markdown Transformations

To add more markdown syntax fixes, edit the `page:before` hook in `index.js`. This hook processes markdown content before GitBook parses it, allowing you to transform any syntax patterns.

Example:

```javascript
'page:before': function (page) {
  // Your custom transformations here
  page.content = page.content.replace(/pattern/g, 'replacement');
  return page;
}
```

## GitBook Hooks Reference

- `page:before`: Modify page content before rendering
- `page`: Modify page after rendering (inject CSS/JS)
- `finish`: Run after all pages are generated

For more information, see: https://gitbook-ng.github.io/plugins/hooks.html

## Publishing (Optional)

If you want to publish this plugin to NPM:

1. Update the `name` in `package.json` (must start with `gitbook-plugin-`)
2. Publish to NPM:

```bash
npm publish
```

Then others can install it with:

```bash
npm install gitbook-plugin-custom-formatting
```
