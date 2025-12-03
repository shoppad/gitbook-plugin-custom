module.exports = {
  // Map of hooks
  hooks: {
    // Hook to modify page content before rendering
    'page:before': function (page) {
      console.log('Custom formatting plugin running on page:', page.path);

      try {
        // Single regex to handle all {% embed ... %} variations
        page.content = page.content.replace(
          // /{%\s*embed\s+(?:url=)?["']?([^"'\s%}]+)["']?\s*%}/g,
          /{%\s*embed\s+(?:url=)?["']?([^"']+)["']?(?:\s+[^%}]*)?%}/g,
          function (match, url) {
            // Only transform if it looks like a URL
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return `{% urlembed %}\n${url}\n{% endurlembed %}`;
            }
            return match;
          }
        );

        // Escape all double curly braces to avoid GitBook parsing errors
        page.content = page.content.replace(/\{\{(\w+)\}\}/g, '\\{{$1\\}}');

        // Regex to match \{{…\}} with optional spaces inside
        const escapedVariableRegex = /\\\{\{\s*([^}]+?)\s*\}\}/g;

        // Replace with literal {{…}} wrapped in backticks
        page.content = page.content.replace(
          escapedVariableRegex,
          (match, inner) => {
            return '`{{' + inner.trim() + '}}`';
          }
        );

        // Transform {% content-ref %} blocks to standard markdown links
        // Pattern: {% content-ref url="..." %}...content...{% endcontent-ref %}
        // Extract the content between the tags and use it as the link
        page.content = page.content.replace(
          /{%\s*content-ref\s+url=["']([^"']+)["']\s*%}([\s\S]*?){%\s*endcontent-ref\s*%}/g,
          function (match, url, content) {
            // Trim whitespace from content
            content = content.trim();
            // If content is empty or just whitespace, create a link from the URL
            if (!content || content.length === 0) {
              var linkText = url.split('/').pop().replace(/\.md$/, '');
              return '[' + linkText + '](' + url + ')';
            }
            // Return the content as-is (it should already be a markdown link)
            return content;
          }
        );

        // Convert {% stepper %} blocks to standard markdown
        // This handles the full stepper block structure
        page.content = page.content.replace(
          /{%\s*stepper\s*%}([\s\S]*?){%\s*endstepper\s*%}/g,
          function (match, content) {
            // Extract all step blocks
            var stepNumber = 1;
            var convertedContent = content.replace(
              /{%\s*step\s*%}([\s\S]*?){%\s*endstep\s*%}/g,
              function (stepMatch, stepContent) {
                // Extract the step title (usually an h4 heading)
                // Match #### heading that might be on its own line or with content
                var titleMatch = stepContent.match(/####\s+(.+?)(?:\n|$)/);
                var stepTitle = titleMatch
                  ? titleMatch[1].trim()
                  : 'Step ' + stepNumber;

                // Remove the title from step content if it exists
                var stepBody = stepContent;
                if (titleMatch) {
                  // Remove the h4 heading line, handling various whitespace scenarios
                  stepBody = stepContent
                    .replace(/####\s+.+?(?:\r?\n|$)/, '')
                    .trim();
                }

                // Clean up the step body (remove leading/trailing whitespace)
                stepBody = stepBody.trim();

                // Ensure proper spacing
                if (stepBody) {
                  stepBody = '\n' + stepBody + '\n';
                }

                // Format as markdown heading with step number
                var result =
                  '\n## Step ' + stepNumber + ': ' + stepTitle + stepBody;
                stepNumber++;
                return result;
              }
            );

            // Clean up any extra newlines
            convertedContent = convertedContent.replace(/\n{3,}/g, '\n\n');

            return convertedContent;
          }
        );

        // Only apply to a specific page
        if (
          page.path ===
          'infinite-options/infinite-options-resolve-theme-app-extension-red-banner-on-preview.md'
        ) {
          // Escape Liquid braces inside <script> tags
          page.content = page.content.replace(
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            (scriptBlock) => {
              return scriptBlock
                .replace(/{{/g, '&#123;&#123;')
                .replace(/}}/g, '&#125;&#125;')
                .replace(/{%-/g, '&#123;%-')
                .replace(/-%}/g, '-%&#125;')
                .replace(/{%/g, '&#123;%')
                .replace(/%}/g, '%&#125;');
            }
          );

          // Escape Liquid braces inside <product-form> tags
          page.content = page.content.replace(
            /<product-form[\s\S]*?>/gi,
            (formTag) => {
              return formTag
                .replace(/{{/g, '&#123;&#123;')
                .replace(/}}/g, '&#125;&#125;')
                .replace(/{%-/g, '&#123;%-')
                .replace(/-%}/g, '-%&#125;')
                .replace(/{%/g, '&#123;%')
                .replace(/%}/g, '%&#125;');
            }
          );

          // Escape closing `{%- form ... -%}` tags
          page.content = page.content.replace(/{%-[\s\S]*?-%}/g, (match) =>
            match.replace(/{%-/g, '&#123;%-').replace(/-%}/g, '-%&#125;')
          );
        }

        // Convert {% tabs %} blocks to GitHub-compatible HTML details/summary
        // Pattern: {% tabs %}...{% tab title="..." %}...{% endtab %}...{% endtabs %}
        page.content = page.content.replace(
          /{%\s*tabs\s*%}([\s\S]*?){%\s*endtabs\s*%}/g,
          function (match, content) {
            // Extract all tab blocks
            var tabsHtml = '';
            // Use a while loop with exec to handle all matches
            var tabRegex =
              /{%\s*tab\s+title=["']([^"']+)["']\s*%}([\s\S]*?){%\s*endtab\s*%}/g;
            var tabMatch;

            while ((tabMatch = tabRegex.exec(content)) !== null) {
              var tabTitle = tabMatch[1];
              var tabContent = tabMatch[2].trim();

              // Convert each tab to a collapsible details/summary block
              tabsHtml +=
                '<details>\n<summary>' +
                tabTitle +
                '</summary>\n\n' +
                tabContent +
                '\n\n</details>\n\n';
            }

            // Return the converted tabs, removing trailing newlines
            return tabsHtml.replace(/\n+$/, '');
          }
        );

        // Convert {% columns %} blocks to markdown tables
        // Pattern: {% columns %}...{% column %}...{% endcolumn %}...{% endcolumns %}
        page.content = page.content.replace(
          /{%\s*columns\s*%}([\s\S]*?){%\s*endcolumns\s*%}/g,
          function (match, content) {
            // Extract all column blocks
            var columns = [];
            var columnRegex = /{%\s*column\s*%}([\s\S]*?){%\s*endcolumn\s*%}/g;
            var columnMatch;

            while ((columnMatch = columnRegex.exec(content)) !== null) {
              var columnContent = columnMatch[1].trim();

              // Extract heading if present (#### Heading or ### Heading)
              var headingMatch = columnContent.match(/^#{1,6}\s+(.+?)(?:\n|$)/);
              var heading = headingMatch ? headingMatch[1].trim() : '';

              // Remove heading from content
              var body = columnContent;
              if (headingMatch) {
                body = columnContent
                  .replace(/^#{1,6}\s+.+?(?:\r?\n|$)/, '')
                  .trim();
              }

              // Clean up the body content (remove extra newlines, preserve list items)
              body = body.replace(/\n{3,}/g, '\n\n');

              // Replace newlines with <br> for table cells (except list items)
              body = body.replace(/\n(?![-*]|\d+\.)/g, '<br>');

              columns.push({
                heading: heading,
                body: body,
              });
            }

            // If no columns found, return original
            if (columns.length === 0) {
              return match;
            }

            // Build markdown table
            var table = '';

            // Table header row
            var headers = columns.map(function (col) {
              return col.heading || '';
            });
            table += '| ' + headers.join(' | ') + ' |\n';

            // Table separator row
            var separators = headers.map(function () {
              return '---';
            });
            table += '|' + separators.join('|') + '|\n';

            // Table body row
            var bodies = columns.map(function (col) {
              return col.body || '';
            });
            table += '| ' + bodies.join(' | ') + ' |';

            return table;
          }
        );

        console.log('Page content after custom formatting:', page.content);

        return page;
      } catch (error) {
        console.error('Error custom formatting page:', error);
        return page;
      }
    },

    // Hook to modify the HTML output
    finish: function () {
      // This hook runs after all pages are generated
      // You can modify the final HTML output here
    },
  },

  // Map of new blocks (custom markdown blocks)
  blocks: {
    // Example: Custom block for formatted code
    'formatted-code': {
      process: function (block) {
        // Process custom block content
        return '<div class="custom-formatted-code">' + block.body + '</div>';
      },
    },
  },

  // Map of new filters (template filters)
  filters: {
    // Example: Custom filter to format text
    'format-text': function (text, options) {
      // Apply custom formatting to text
      if (options && options.uppercase) {
        return text.toUpperCase();
      }
      return text;
    },
  },
};
