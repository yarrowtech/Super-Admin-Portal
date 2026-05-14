# Simple Frontend Structure

Use this structure for new code:

```txt
src/
  assets/       images, icons, static files
  components/   reusable UI and dashboard components
  layouts/      page shells like AuthLayout and DashboardLayout
  pages/        full page screens
  routes/       app routes and route protection
  hooks/        reusable React hooks
  services/     API calls
  store/        global app state
  utils/        helper functions
```

Simple rule:

- Put full screens in `pages`.
- Put reusable UI in `components`.
- Put API calls in `services`.
- Put route protection in `routes`.
- Put shared logic in `hooks` or `utils`.

