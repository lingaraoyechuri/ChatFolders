const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

// Plugin to remove remote script URLs from bundled code
class RemoveRemoteScriptsPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "RemoveRemoteScriptsPlugin",
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: "RemoveRemoteScriptsPlugin",
            stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets) => {
            Object.keys(assets).forEach((filename) => {
              if (filename.endsWith(".js") && !filename.endsWith(".map")) {
                let source = assets[filename].source();

                source = source.replace(
                  /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdfobject\/[^"']*/g,
                  ""
                );

                source = source.replace(
                  /"https:\/\/cdnjs\.cloudflare\.com[^"]*"/g,
                  '""'
                );

                source = source.replace(
                  /var\s+\w+\s*=\s*"https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdfobject\/[^"]*"/g,
                  'var a=""'
                );

                assets[filename] = new compiler.webpack.sources.RawSource(
                  source
                );
              }
            });
          }
        );
      }
    );
  }
}

module.exports = {
  mode: "development",
  devtool: "cheap-module-source-map",
  entry: {
    content: path.resolve(__dirname, "src/content/content.tsx"),
    background: path.resolve(__dirname, "src/background/background.ts"),
    popup: path.resolve(__dirname, "src/popup/popup.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    publicPath: "",
  },
  externals: {
    "https://fonts.googleapis.com": "undefined",
    "https://fonts.gstatic.com": "undefined",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
    new RemoveRemoteScriptsPlugin(),
  ],
};
