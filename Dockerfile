FROM python:3.13-slim
WORKDIR /app
COPY . .
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8798
EXPOSE 8798
# Quiz backend only. Never expose real_git_server.py.
CMD ["sh", "-c", "exec python3 live_quiz_server.py --host 0.0.0.0 --port \"${PORT:-8798}\""]
