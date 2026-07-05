import smtplib
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader
import os
from app.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

# Set up templates directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
templates_dir = os.path.join(root_dir, "templates", "email")
os.makedirs(templates_dir, exist_ok=True)

# Default template values if templates aren't customized
DEFAULT_TEMPLATES = {
    "ticket_reply.html": """
    <html>
      <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2>Hello, {{ username }}!</h2>
        <p>A new reply has been added to your ticket: <strong>{{ subject }}</strong>.</p>
        <blockquote style="background: #f4f4f4; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
          {{ reply_message }}
        </blockquote>
        <p>View your ticket details on the <a href="{{ dash_url }}">Flux Client Dashboard</a>.</p>
      </body>
    </html>
    """,
    "suspension_notice.html": """
    <html>
      <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2>Hello, {{ username }}!</h2>
        <p>We are writing to inform you that your server <strong>{{ server_name }}</strong> has been suspended.</p>
        <p><strong>Reason:</strong> {{ reason }}</p>
        <p>If you believe this is an error, please open a support ticket immediately.</p>
      </body>
    </html>
    """,
    "low_balance.html": """
    <html>
      <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2>Hello, {{ username }}!</h2>
        <p>Your current coin balance (<strong>{{ balance }} coins</strong>) is running low.</p>
        <p>Please top up your wallet to ensure your servers remain active and are not suspended.</p>
        <p><a href="{{ dash_url }}/store" style="background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Store</a></p>
      </body>
    </html>
    """
}

# Write default templates if not exist
for name, content in DEFAULT_TEMPLATES.items():
    path = os.path.join(templates_dir, name)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

jinja_env = Environment(loader=FileSystemLoader(templates_dir))

def _send_email_sync(to_email: str, subject: str, body: str):
    """
    Synchronous SMTP helper to run in asyncio executor.
    """
    if not settings.SMTP_HOST:
        logger.warning(f"SMTP not configured. Email to {to_email} skipped. Subject: {subject}")
        return
        
    msg = EmailMessage()
    msg.set_content(body, subtype="html")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    
    try:
        # Connect to SMTP server
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")

async def send_transactional_email(to_email: str, subject: str, template_name: str, context: dict):
    """
    Renders a Jinja2 template and sends it asynchronously.
    """
    try:
        template = jinja_env.get_template(template_name)
        html_content = template.render(**context)
        
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _send_email_sync, to_email, subject, html_content)
    except Exception as e:
        logger.error(f"Error rendering/sending email {template_name}: {e}")
