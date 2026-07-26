_This project has been created as part of the 42 curriculum._
<!-- Add all team logins above, e.g.: ...by <login1>, <login2>, <login3>, <login4>, <login5>. -->

# poolaki

> Multi-user expense tracker web app — 42 `ft_transcendence` team project.

## Description

**poolaki** is a multi-user web application for tracking and sharing expenses.
Users can sign up, log in securely, record expenses, and (depending on the modules
we ship) split, categorize, and analyze their spending together in real time.

This repository is the team monorepo: the **backend** and **frontend** live side by
side and are deployed together with a single command via containers.

Key planned features:
- Secure user accounts (email + password, hashed & salted)
- Personal and shared expense tracking
- Categories, filtering, and reporting
- Multi-user / concurrent usage with no data races

## Instructions

> Prerequisites and run steps will be filled in as the stack is finalized.

```bash
# clone
git clone git@github.com:tim-daria/poolaki.git
cd poolaki

# configure environment (never commit real secrets)
cp .env.example .env

# run (single command — to be wired up)
docker compose up --build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Project Documentation

- AI Service documentation: [ai-service/README.md](ai-service/README.md)

## Resources

- Project subject: 42 `ft_transcendence`
- _(documentation, articles, and a note on how AI was used will be added here)_
