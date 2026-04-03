import './globals.css'

export const metadata = {
  title: 'ESL Voice Recorder',
  description: 'Recording app for ESL students',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
