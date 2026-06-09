import json

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import redirect_to_login
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.http import require_POST


from .forms import RegisterForm, UserProfileForm, UserUpdateForm
from .models import CVDownload, UserProfile
from .template_choices import RESUME_TEMPLATES


GUEST_DEMO_SLUGS = {'artistic', 'bloom', 'timeless'}


@ensure_csrf_cookie
def demo(request):
    return render(request, 'demo.html')


@ensure_csrf_cookie
def template_detail(request, slug):
    template = next((item for item in RESUME_TEMPLATES if item['slug'] == slug), None)

    if template is None:
        raise Http404('Template not found')

    if not request.user.is_authenticated and slug not in GUEST_DEMO_SLUGS:
        messages.info(request, 'Log in or register to unlock all resume templates.')
        return redirect_to_login(request.get_full_path(), login_url='resume:login')

    return render(request, template['template'], {
        'can_download': request.user.is_authenticated,
        'is_guest_demo': not request.user.is_authenticated,
        'template_name': template['name'],
        'template_slug': template['slug'],
    })


def register_view(request):
    if request.user.is_authenticated:
        return redirect('resume:profile')

    form = RegisterForm(request.POST or None)

    if request.method == 'POST' and form.is_valid():
        user = form.save()
        UserProfile.objects.get_or_create(user=user)
        login(request, user)
        messages.success(request, 'Account created successfully.')
        return redirect('resume:profile')

    return render(request, 'register.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('resume:profile')

    form = AuthenticationForm(request, data=request.POST or None)

    if request.method == 'POST' and form.is_valid():
        login(request, form.get_user())
        messages.success(request, 'Welcome back.')
        return redirect(request.GET.get('next') or 'resume:profile')

    return render(request, 'login.html', {'form': form})


def logout_view(request):
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('resume:demo')


@login_required
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    user_form = UserUpdateForm(request.POST or None, instance=request.user)
    profile_form = UserProfileForm(request.POST or None, request.FILES or None, instance=profile)

    if request.method == 'POST' and user_form.is_valid() and profile_form.is_valid():
        user_form.save()
        profile_form.save()
        messages.success(request, 'Profile updated successfully.')
        return redirect('resume:profile')

    downloads = CVDownload.objects.filter(user=request.user)[:10]

    return render(request, 'profile.html', {
        'downloads': downloads,
        'profile': profile,
        'profile_form': profile_form,
        'user_form': user_form,
    })


@require_POST
@login_required
def record_download(request):
    if request.content_type == 'application/json':
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'created': False, 'error': 'Invalid JSON.'}, status=400)
    else:
        payload = request.POST

    if not hasattr(payload, 'get'):
        return JsonResponse({'created': False, 'error': 'Invalid payload.'}, status=400)

    title = payload.get('title') or 'Modern CV'
    language = payload.get('language') or 'en'
    template_slug = payload.get('template_slug') or ''
    snapshot_html = payload.get('snapshot_html') or ''

    valid_slugs = {template['slug'] for template in RESUME_TEMPLATES}
    if template_slug not in valid_slugs:
        return JsonResponse({'created': False, 'error': 'Invalid template.'}, status=400)

    if not snapshot_html or len(snapshot_html) > 5_000_000:
        return JsonResponse({'created': False, 'error': 'Invalid CV snapshot.'}, status=400)

    download = CVDownload.objects.create(
        user=request.user,
        title=title[:160],
        language=language[:20],
        template_slug=template_slug,
        snapshot_html=snapshot_html,
    )

    return JsonResponse({
        'created': True,
        'detail_url': reverse('resume:download_detail', args=[download.pk]),
        'downloaded_at': download.downloaded_at.isoformat(),
    })


@login_required
def download_detail(request, pk):
    download = get_object_or_404(CVDownload, pk=pk, user=request.user)
    return render(request, 'download_detail.html', {
        'download': download,
        'print_on_load': request.GET.get('print') == '1',
    })


@login_required
@xframe_options_sameorigin
def download_snapshot(request, pk):
    download = get_object_or_404(CVDownload, pk=pk, user=request.user)
    if not download.snapshot_html:
        raise Http404('CV snapshot not found')

    response = HttpResponse(download.snapshot_html, content_type='text/html; charset=utf-8')
    response['Content-Security-Policy'] = (
        "default-src 'none'; style-src 'unsafe-inline'; "
        "img-src 'self' data: blob:; font-src 'self' data:"
    )
    response['X-Content-Type-Options'] = 'nosniff'
    return response
