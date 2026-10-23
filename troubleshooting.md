If EBADENGINE:


curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc

nvm install 24
nvm use 24

cd frontend
npm ci