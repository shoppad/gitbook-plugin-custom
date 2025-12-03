module.exports = {
  // Map of hooks
  hooks: {
    // Hook to modify page content before rendering
    'page:before': function (page) {
      console.log('Custom formatting plugin running on page:', page.path);

      try {
        // Single regex to handle all {% embed ... %} variations
        page.content = page.content.replace(
          /{%\s*embed\s+(?:url=)?["']?([^"'\s%}]+)["']?\s*%}/g,
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

        // Regex to match \{{…\}} with optional spaces inside
        page.content = page.content.replace(
          /\\?\{\{\s*([^}]+?)\s*\}\}/g,
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
