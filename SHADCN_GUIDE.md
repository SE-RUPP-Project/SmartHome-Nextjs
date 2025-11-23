# 📘 shadcn/ui Integration Guide

## What is shadcn/ui?

shadcn/ui is NOT a component library. It's a collection of re-usable components that you can copy and paste into your apps.

**Key Concepts:**
- Components are copied to your project
- Full control over the code
- Built on Radix UI primitives
- Styled with Tailwind CSS
- No package to install
- No proprietary license

## Adding Components

```bash
# Add individual component
npx shadcn@latest add button

# This creates: src/components/ui/button.tsx
```

## Using Components

```tsx
import { Button } from "@/components/ui/button"

<Button>Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
```

## Available Components

After running `npx shadcn@latest add [component]`:

### Form Components
- `button` - Buttons with variants
- `input` - Text inputs
- `label` - Form labels
- `select` - Dropdown selects
- `switch` - Toggle switches
- `checkbox` - Checkboxes
- `textarea` - Text areas

### Layout Components
- `card` - Content cards
- `separator` - Dividers
- `tabs` - Tab navigation
- `dialog` - Modals
- `sheet` - Slide-over panels

### Feedback Components
- `badge` - Status badges
- `toast` - Notifications
- `alert` - Alert messages
- `progress` - Progress bars

### Navigation Components
- `dropdown-menu` - Dropdown menus
- `navigation-menu` - Nav menus
- `command` - Command palette

### Data Display
- `table` - Data tables
- `avatar` - User avatars
- `tooltip` - Tooltips

## Customizing Components

All components are in `src/components/ui/`. Edit them directly!

```tsx
// src/components/ui/button.tsx
// Change colors, sizes, variants - it's YOUR code!
```

## Example: Login Form

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginForm() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

## Variants

Most components support variants:

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Badge variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

## Dark Mode

shadcn/ui supports dark mode out of the box:

```tsx
<html className="dark">
  {/* All components adapt automatically */}
</html>
```

## Best Practices

1. **Add components as needed** - Don't add all at once
2. **Customize freely** - They're your components
3. **Use Tailwind utilities** - Combine with Tailwind classes
4. **Follow Radix docs** - For advanced features

## Common Patterns

### Form with Validation

```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" required />
    </div>
    <Button type="submit">Submit</Button>
  </div>
</form>
```

### Modal Dialog

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Data Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Device Status</CardTitle>
    <CardDescription>Monitor your devices</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid gap-4">
      {/* Content */}
    </div>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Documentation](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

**Remember: shadcn/ui components are YOURS to modify!**
