#!/usr/bin/env bash

echo
echo "=== Cleaning CDK ==="
cd CDK || exit
rm -rf node_modules
rm -rf cdk.out
npm install

echo
echo "=== Cleaning CDK/functions ==="
cd functions || exit
rm -rf node_modules
npm install

echo
echo "=== Back to repo root ==="
cd ../../ || exit

echo
echo "=== Cleaning Marketplace client ==="
cd Marketplace || exit
rm -rf node_modules
npm install
npm run build

echo "DONE - now you're ready to deploy"
