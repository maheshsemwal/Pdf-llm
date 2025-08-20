#!/bin/bash
set -o errexit  # exit on error

cd backend
pip install --upgrade pip
pip install -r requirements.txt