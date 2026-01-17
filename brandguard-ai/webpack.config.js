const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
require("dotenv").config();

const isEnvProduction = process.env.NODE_ENV === "production";

const uiPath = path.resolve(__dirname, "./src/ui");
const utilsPath = path.resolve(__dirname, "./src/utils");
const sandboxPath = path.resolve(__dirname, "./src/sandbox");

module.exports = {
    mode: isEnvProduction ? "production" : "development",
    devtool: "source-map",
    entry: {
        index: "./src/ui/index.tsx",
        code: "./src/sandbox/code.ts"
    },
    experiments: {
        outputModule: true
    },
    output: {
        pathinfo: !isEnvProduction,
        path: path.resolve(__dirname, "dist"),
        module: true,
        filename: "[name].js"
    },
    externalsType: "module",
    externalsPresets: { web: true },
    externals: {
        "add-on-sdk-document-sandbox": "add-on-sdk-document-sandbox",
        "express-document-sdk": "express-document-sdk"
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html",
            scriptLoading: "module",
            excludeChunks: ["code"]
        }),
        new CopyWebpackPlugin({
            patterns: [{ from: "src/*.json", to: "[name][ext]" }]
        }),
        new webpack.DefinePlugin({
            "process.env.GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || ""),
            "process.env.GEMINI_API_KEY_BACKUP": JSON.stringify(process.env.GEMINI_API_KEY_BACKUP || ""),
            // Also define as global constants for easier access
            "GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || ""),
            "GEMINI_API_KEY_BACKUP": JSON.stringify(process.env.GEMINI_API_KEY_BACKUP || "")
        })
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.resolve(__dirname, "tsconfig.json")
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /(\.css)$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".css"]
    }
};
