FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system app \
    && adduser --system --ingroup app app

COPY requirements.txt /app/requirements.txt
RUN python -m pip install -r /app/requirements.txt

ENV HOME=/home/app
RUN usermod --home /home/app app \
    && mkdir -p /home/app \
    && chown app:app /home/app

COPY --chown=app:app . /app

RUN mkdir -p /app/staticfiles /app/media \
    && chown -R app:app /app/staticfiles /app/media \
    && sed -i 's/\r$//' /app/docker/entrypoint.sh /app/docker/cleanup-loop.sh \
    && chmod +x /app/docker/entrypoint.sh /app/docker/cleanup-loop.sh

USER app

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "90", "--graceful-timeout", "30", "--max-requests", "1000", "--max-requests-jitter", "100", "--access-logfile", "-", "--error-logfile", "-", "config.wsgi:application"]
