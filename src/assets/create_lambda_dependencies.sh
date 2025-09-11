#!/bin/bash

# Default values
DEFAULT_LAYER_NAME="genai-assistant-layer"
DEFAULT_S3_BUCKET="salaunch"
DEFAULT_S3_KEY="genai-assistant-layer.zip"
DEFAULT_RUNTIME="python3.9"
LAYER_FOLDER="python"
LAYER_ZIP=$DEFAULT_S3_KEY
REQUIREMENTS_FILE="requirements.txt"


# Input parameters
LAMBDA_FUNCTION_NAME=$1
S3_BUCKET="${2:-$DEFAULT_S3_BUCKET}"
S3_KEY="${3:-$DEFAULT_S3_KEY}"
LAYER_NAME="${4:-$DEFAULT_LAYER_NAME}"
RUNTIME="${5:-$DEFAULT_RUNTIME}"


if [[ -z "$LAMBDA_FUNCTION_NAME" || -z "$S3_BUCKET" ]]; then
 echo "Usage: $0 <lambda-function-name> <s3-bucket-name> "
 exit 1
fi


# Step 1: Installing python dependencies

echo "Installing dependencies into $LAYER_FOLDER/ ..."
rm -rf "$LAYER_FOLDER" "$LAYER_ZIP"
mkdir -p "$LAYER_FOLDER"

pip install -r "$REQUIREMENTS_FILE" -t "$LAYER_FOLDER"

echo "Creating $LAYER_ZIP ..."
zip -r "$LAYER_ZIP" "$LAYER_FOLDER" > /dev/null


# Step 2: Upload depedencies zip file on Amazon S3 bucket 


echo "Uploading python depedencies zipfile to S3 Bucket" 
aws s3 cp $LAYER_ZIP s3://$S3_BUCKET


# Step 3: Publish the new layer version

echo "Publishing layer from S3..."
LAYER_VERSION_ARN=$(aws lambda publish-layer-version \
 —layer-name "$LAYER_NAME" \
 —content S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
 —compatible-runtimes "$RUNTIME" \
 —query 'LayerVersionArn' \
 —output text)


if [[ -z "$LAYER_VERSION_ARN" ]]; then
 echo "Failed to publish layer."
 exit 1
fi

echo "Published Layer ARN: $LAYER_VERSION_ARN"


# Step 4: Update Lambda function with new layer
aws lambda update-function-configuration \
 —function-name "$LAMBDA_FUNCTION_NAME" \
 —layers "$LAYER_VERSION_ARN"


echo "Complete. Amazon Lambda function updated with new layer."

