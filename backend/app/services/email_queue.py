import logging
from typing import Any, Callable

from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)


def enqueue_email(
    background_tasks: BackgroundTasks | None,
    fn: Callable[..., Any],
    *args: Any,
    **kwargs: Any,
) -> None:
    """Enqueue an email send operation; fallback to sync if BackgroundTasks is not provided."""
    if background_tasks:
        logger.info(
            "email_enqueued",
            extra={"task": getattr(fn, "__name__", "unknown"), "args_count": len(args)},
        )
        background_tasks.add_task(fn, *args, **kwargs)
    else:
        logger.info(
            "email_enqueued",
            extra={"task": getattr(fn, "__name__", "unknown"), "args_count": len(args)},
        )
        fn(*args, **kwargs)
