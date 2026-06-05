from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.http import JsonResponse
from django.http import Http404
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST


from .forms import RegisterForm, UserProfileForm, UserUpdateForm
from .models import CVDownload, UserProfile
from .template_choices import RESUME_TEMPLATES


@ensure_csrf_cookie
def demo(request):
    return render(request, 'demo.html')


def template_detail(request, slug):
    template = next((item for item in RESUME_TEMPLATES if item['slug'] == slug), None)

    if template is None:
        raise Http404('Template not found')

    return render(request, template['template'])


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
    title = request.POST.get('title') or 'Modern CV'
    language = request.POST.get('language') or 'en'
    download = CVDownload.objects.create(
        user=request.user,
        title=title[:160],
        language=language[:20],
    )

    return JsonResponse({
        'created': True,
        'downloaded_at': download.downloaded_at.isoformat(),
    })
